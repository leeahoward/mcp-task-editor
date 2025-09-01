import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { TasksData, Request, Task, RequestSummary, ApiError } from '@/types';
import { TasksDataSchema, RequestSchema, TaskSchema } from '@/schemas/validation';

const TASKS_FILE_PATH = path.join(process.cwd(), 'tasks.json');
const BACKUP_DIR = path.join(process.cwd(), '.backups');
const LOCK_FILE_PATH = path.join(process.cwd(), '.tasks.lock');
const MAX_BACKUPS = 10; // Keep only the 10 most recent backups
const LOCK_TIMEOUT = 30000; // 30 seconds lock timeout

export class TasksDataService {
  private static instance: TasksDataService;
  private data: TasksData | null = null;
  private lockFile: number | null = null;

  private constructor() {}

  static getInstance(): TasksDataService {
    if (!TasksDataService.instance) {
      TasksDataService.instance = new TasksDataService();
    }
    return TasksDataService.instance;
  }

  /**
   * Calculate checksum for data integrity verification
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Acquire a file system lock to prevent concurrent modifications
   */
  private async acquireLock(): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < LOCK_TIMEOUT) {
      try {
        // Create a lock file with exclusive access
        this.lockFile = await fs.open(LOCK_FILE_PATH, 'wx');
        
        // Write process ID and timestamp to lock file
        const lockInfo = {
          pid: process.pid,
          timestamp: new Date().toISOString(),
          host: require('os').hostname()
        };
        await fs.writeFile(this.lockFile, JSON.stringify(lockInfo, null, 2));
        return;
      } catch (error) {
        if ((error as any).code === 'EEXIST') {
          // Lock file exists, check if it's stale
          try {
            const lockContent = await fs.readFile(LOCK_FILE_PATH, 'utf-8');
            const lockInfo = JSON.parse(lockContent);
            const lockAge = Date.now() - new Date(lockInfo.timestamp).getTime();
            
            // If lock is older than timeout, remove it and try again
            if (lockAge > LOCK_TIMEOUT) {
              await fs.unlink(LOCK_FILE_PATH);
              continue;
            }
          } catch {
            // Invalid lock file, remove it
            await fs.unlink(LOCK_FILE_PATH).catch(() => {});
            continue;
          }
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw new ApiError('Failed to acquire file lock', 500);
        }
      }
    }
    
    throw new ApiError('Timeout waiting for file lock', 409);
  }

  /**
   * Release the file system lock
   */
  private async releaseLock(): Promise<void> {
    if (this.lockFile) {
      try {
        await fs.close(this.lockFile);
        await fs.unlink(LOCK_FILE_PATH);
      } catch (error) {
        console.error('Error releasing lock:', error);
      } finally {
        this.lockFile = null;
      }
    }
  }

  /**
   * Create a backup of the current tasks.json file with enhanced management
   */
  private async createBackup(): Promise<void> {
    try {
      await fs.ensureDir(BACKUP_DIR);
      
      if (await fs.pathExists(TASKS_FILE_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `tasks-${timestamp}.json`);
        
        // Read original file and create checksum
        const originalContent = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
        const checksum = this.calculateChecksum(originalContent);
        
        // Create backup with metadata
        const backupData = {
          timestamp: new Date().toISOString(),
          checksum,
          data: JSON.parse(originalContent)
        };
        
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
        
        // Clean up old backups
        await this.cleanupOldBackups();
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
      // Don't throw here - backup failure shouldn't prevent operations
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent ones
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupFiles = await fs.readdir(BACKUP_DIR);
      const taskBackups = backupFiles
        .filter(file => file.startsWith('tasks-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_DIR, file),
          // Extract timestamp from filename
          timestamp: file.replace('tasks-', '').replace('.json', '')
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Sort newest first

      // Remove old backups beyond the limit
      if (taskBackups.length > MAX_BACKUPS) {
        const backupsToDelete = taskBackups.slice(MAX_BACKUPS);
        for (const backup of backupsToDelete) {
          await fs.unlink(backup.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Restore from the most recent backup if main file is corrupted
   */
  private async restoreFromBackup(): Promise<TasksData | null> {
    try {
      const backupFiles = await fs.readdir(BACKUP_DIR);
      const taskBackups = backupFiles
        .filter(file => file.startsWith('tasks-') && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(BACKUP_DIR, file),
          timestamp: file.replace('tasks-', '').replace('.json', '')
        }))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Sort newest first

      for (const backup of taskBackups) {
        try {
          const backupContent = await fs.readFile(backup.path, 'utf-8');
          const backupData = JSON.parse(backupContent);
          
          // Validate the backup data structure
          if (backupData.data && backupData.checksum) {
            const dataString = JSON.stringify(backupData.data);
            const calculatedChecksum = this.calculateChecksum(dataString);
            
            if (calculatedChecksum === backupData.checksum) {
              // Valid backup found, validate against schema
              const validatedData = TasksDataSchema.parse(backupData.data);
              
              // Restore the main file
              await fs.writeFile(TASKS_FILE_PATH, JSON.stringify(validatedData, null, 2));
              console.log(`Restored from backup: ${backup.name}`);
              
              return validatedData;
            }
          }
        } catch (error) {
          console.error(`Failed to restore from backup ${backup.name}:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to restore from any backup:', error);
    }
    
    return null;
  }

  /**
   * Load data from tasks.json file with enhanced error recovery
   */
  async loadData(): Promise<TasksData> {
    try {
      if (!await fs.pathExists(TASKS_FILE_PATH)) {
        // Create initial file if it doesn't exist
        const initialData: TasksData = { requests: [] };
        await this.saveData(initialData);
        return initialData;
      }

      const fileContent = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
      
      // Verify file is not empty
      if (!fileContent.trim()) {
        console.error('Empty file detected, attempting backup restoration');
        const restoredData = await this.restoreFromBackup();
        if (restoredData) {
          this.data = restoredData;
          return restoredData;
        }
        throw new Error('Empty file detected');
      }
      
      let rawData;
      try {
        rawData = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('JSON parse error, attempting backup restoration:', parseError);
        const restoredData = await this.restoreFromBackup();
        if (restoredData) {
          this.data = restoredData;
          return restoredData;
        }
        throw new ApiError('Invalid JSON format and no valid backup available', 400);
      }
      
      // Validate the data structure
      let validatedData;
      try {
        validatedData = TasksDataSchema.parse(rawData);
      } catch (validationError) {
        console.error('Data validation error, attempting backup restoration:', validationError);
        const restoredData = await this.restoreFromBackup();
        if (restoredData) {
          this.data = restoredData;
          return restoredData;
        }
        throw new ApiError('Invalid data structure and no valid backup available', 400);
      }
      
      this.data = validatedData;
      return validatedData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(`Failed to load tasks data: ${error}`, 500);
    }
  }

  /**
   * Save data to tasks.json file with enhanced atomic operations
   */
  private async saveData(data: TasksData): Promise<void> {
    console.log(`🔒 Acquiring lock for saveData...`);
    await this.acquireLock();
    
    try {
      console.log(`📦 Creating backup before saving...`);
      // Create backup before saving
      await this.createBackup();
      
      // Validate data before saving
      const validatedData = TasksDataSchema.parse(data);
      console.log(`✅ Data validation passed for ${validatedData.requests.length} requests`);
      
      // Serialize data
      const dataString = JSON.stringify(validatedData, null, 2);
      const checksum = this.calculateChecksum(dataString);
      
      // Write to temporary file first (atomic operation)
      const tempPath = `${TASKS_FILE_PATH}.tmp`;
      const tempChecksumPath = `${tempPath}.checksum`;
      
      try {
        console.log(`📝 Writing data to temporary file: ${tempPath}`);
        // Write data and checksum
        await fs.writeFile(tempPath, dataString);
        await fs.writeFile(tempChecksumPath, checksum);
        
        // Verify the written data
        const writtenData = await fs.readFile(tempPath, 'utf-8');
        const writtenChecksum = this.calculateChecksum(writtenData);
        
        if (writtenChecksum !== checksum) {
          throw new Error('Data integrity check failed after write');
        }
        
        console.log(`🔄 Renaming temporary files to final location...`);
        // Atomic rename operations
        await fs.rename(tempPath, TASKS_FILE_PATH);
        await fs.rename(tempChecksumPath, `${TASKS_FILE_PATH}.checksum`);
        
        this.data = validatedData;
        console.log(`💾 Data saved successfully with ${validatedData.requests.length} requests`);
      } catch (error) {
        console.log(`❌ Error during file operations, cleaning up...`);
        // Clean up temporary files on error
        await fs.unlink(tempPath).catch(() => {});
        await fs.unlink(tempChecksumPath).catch(() => {});
        throw error;
      }
    } finally {
      console.log(`🔓 Releasing lock after saveData...`);
      await this.releaseLock();
    }
  }

  /**
   * Verify data integrity using checksum
   */
  async verifyDataIntegrity(): Promise<boolean> {
    try {
      if (!await fs.pathExists(TASKS_FILE_PATH) || !await fs.pathExists(`${TASKS_FILE_PATH}.checksum`)) {
        return false;
      }
      
      const fileContent = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
      const storedChecksum = await fs.readFile(`${TASKS_FILE_PATH}.checksum`, 'utf-8');
      const calculatedChecksum = this.calculateChecksum(fileContent);
      
      return storedChecksum.trim() === calculatedChecksum;
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      return false;
    }
  }

  /**
   * Get backup information and status
   */
  async getBackupStatus(): Promise<{
    totalBackups: number;
    latestBackup: string | null;
    backupDirectory: string;
    integrityCheck: boolean;
  }> {
    try {
      await fs.ensureDir(BACKUP_DIR);
      const backupFiles = await fs.readdir(BACKUP_DIR);
      const taskBackups = backupFiles
        .filter(file => file.startsWith('tasks-') && file.endsWith('.json'))
        .sort((a, b) => b.localeCompare(a)); // Sort newest first

      const integrityCheck = await this.verifyDataIntegrity();

      return {
        totalBackups: taskBackups.length,
        latestBackup: taskBackups.length > 0 ? taskBackups[0] : null,
        backupDirectory: BACKUP_DIR,
        integrityCheck
      };
    } catch (error) {
      console.error('Error getting backup status:', error);
      return {
        totalBackups: 0,
        latestBackup: null,
        backupDirectory: BACKUP_DIR,
        integrityCheck: false
      };
    }
  }

  /**
   * Force creation of a backup (useful for manual backup operations)
   */
  async createManualBackup(): Promise<string | null> {
    try {
      if (!await fs.pathExists(TASKS_FILE_PATH)) {
        throw new Error('No tasks.json file to backup');
      }

      await fs.ensureDir(BACKUP_DIR);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `tasks-manual-${timestamp}.json`);
      
      // Read original file and create checksum
      const originalContent = await fs.readFile(TASKS_FILE_PATH, 'utf-8');
      const checksum = this.calculateChecksum(originalContent);
      
      // Create backup with metadata
      const backupData = {
        timestamp: new Date().toISOString(),
        checksum,
        type: 'manual',
        data: JSON.parse(originalContent)
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      return backupPath;
    } catch (error) {
      console.error('Failed to create manual backup:', error);
      return null;
    }
  }

  /**
   * Get all requests as full Request objects
   */
  async getAllFullRequests(): Promise<Request[]> {
    const data = await this.loadData();
    return data.requests;
  }

  /**
   * Get all requests with summary data
   */
  async getAllRequests(): Promise<RequestSummary[]> {
    const data = await this.loadData();
    
    return data.requests.map(request => {
      const totalTasks = request.tasks.length;
      const completedTasks = request.tasks.filter(task => task.done).length;
      const approvedTasks = request.tasks.filter(task => task.approved).length;
      
      return {
        requestId: request.requestId,
        originalRequest: request.originalRequest,
        totalTasks,
        completedTasks,
        approvedTasks,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        approvalPercentage: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0,
        completed: request.completed
      };
    });
  }

  /**
   * Get a single request by ID
   */
  async getRequest(requestId: string): Promise<Request | null> {
    const data = await this.loadData();
    return data.requests.find(request => request.requestId === requestId) || null;
  }

  /**
   * Create a new request
   */
  async createRequest(requestData: Omit<Request, 'requestId'>): Promise<Request> {
    const data = await this.loadData();
    
    // Generate new request ID
    const existingIds = data.requests.map(r => r.requestId);
    let newId = 1;
    while (existingIds.includes(`req-${newId}`)) {
      newId++;
    }
    
    const newRequest: Request = {
      requestId: `req-${newId}`,
      ...requestData
    };
    
    // Validate the new request
    RequestSchema.parse(newRequest);
    
    data.requests.push(newRequest);
    await this.saveData(data);
    
    return newRequest;
  }

  /**
   * Update an existing request
   */
  async updateRequest(requestId: string, updates: Partial<Request>): Promise<Request> {
    const data = await this.loadData();
    const requestIndex = data.requests.findIndex(r => r.requestId === requestId);
    
    if (requestIndex === -1) {
      throw new ApiError('Request not found', 404);
    }
    
    const updatedRequest = { ...data.requests[requestIndex], ...updates };
    
    // Validate the updated request
    RequestSchema.parse(updatedRequest);
    
    data.requests[requestIndex] = updatedRequest;
    await this.saveData(data);
    
    return updatedRequest;
  }

  /**
   * Delete a request
   */
  async deleteRequest(requestId: string): Promise<void> {
    console.log(`🗂️ TasksDataService.deleteRequest called for ${requestId}`);
    
    const data = await this.loadData();
    console.log(`📋 Current data before deletion:`, {
      totalRequests: data.requests.length,
      requestIds: data.requests.map(r => r.requestId)
    });
    
    const requestIndex = data.requests.findIndex(r => r.requestId === requestId);
    console.log(`🔍 Found request ${requestId} at index:`, requestIndex);
    
    if (requestIndex === -1) {
      console.log(`❌ Request ${requestId} not found`);
      throw new ApiError('Request not found', 404);
    }
    
    console.log(`✂️ Removing request ${requestId} from data...`);
    data.requests.splice(requestIndex, 1);
    
    console.log(`📋 Data after removal:`, {
      totalRequests: data.requests.length,
      requestIds: data.requests.map(r => r.requestId)
    });
    
    console.log(`💾 Saving data for ${requestId}...`);
    await this.saveData(data);
    console.log(`✅ Request ${requestId} deleted and data saved successfully`);
  }

  /**
   * Get a single task
   */
  async getTask(requestId: string, taskId: string): Promise<Task | null> {
    const request = await this.getRequest(requestId);
    if (!request) return null;
    
    return request.tasks.find(task => task.id === taskId) || null;
  }

  /**
   * Create a new task in a request
   */
  async createTask(requestId: string, taskData: Omit<Task, 'id'>): Promise<Task> {
    const data = await this.loadData();
    const requestIndex = data.requests.findIndex(r => r.requestId === requestId);
    
    if (requestIndex === -1) {
      throw new ApiError('Request not found', 404);
    }
    
    // Generate new task ID
    const existingIds = data.requests[requestIndex].tasks.map(t => t.id);
    let newId = 1;
    while (existingIds.includes(`task-${newId}`)) {
      newId++;
    }
    
    const newTask: Task = {
      id: `task-${newId}`,
      ...taskData
    };
    
    // Validate the new task
    TaskSchema.parse(newTask);
    
    data.requests[requestIndex].tasks.push(newTask);
    await this.saveData(data);
    
    return newTask;
  }

  /**
   * Update a task
   */
  async updateTask(requestId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const data = await this.loadData();
    const requestIndex = data.requests.findIndex(r => r.requestId === requestId);
    
    if (requestIndex === -1) {
      throw new ApiError('Request not found', 404);
    }
    
    const taskIndex = data.requests[requestIndex].tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new ApiError('Task not found', 404);
    }
    
    const updatedTask = { ...data.requests[requestIndex].tasks[taskIndex], ...updates };
    
    // Validate the updated task
    TaskSchema.parse(updatedTask);
    
    data.requests[requestIndex].tasks[taskIndex] = updatedTask;
    await this.saveData(data);
    
    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(requestId: string, taskId: string): Promise<void> {
    const data = await this.loadData();
    const requestIndex = data.requests.findIndex(r => r.requestId === requestId);
    
    if (requestIndex === -1) {
      throw new ApiError('Request not found', 404);
    }
    
    const taskIndex = data.requests[requestIndex].tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new ApiError('Task not found', 404);
    }
    
    data.requests[requestIndex].tasks.splice(taskIndex, 1);
    await this.saveData(data);
  }
}

// Create and export the singleton instance
export const tasksDataService = TasksDataService.getInstance();
