import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { tasksDataService, TasksDataService } from '@/services/tasksDataService';
import { TasksData, Request, Task, ApiError } from '@/types';

// Mock fs-extra for controlled testing
vi.mock('fs-extra');
vi.mock('os', () => ({
  hostname: () => 'test-host'
}));

// Create a proper crypto mock with chainable methods
const createMockHash = () => ({
  update: vi.fn().mockReturnThis(),
  digest: vi.fn().mockReturnValue('test-checksum-123')
});

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      createHash: vi.fn(() => createMockHash())
    }
  };
});

const mockFs = vi.mocked(fs);

describe('TasksDataService Integration Tests', () => {
  let service: TasksDataService;
  let testData: TasksData;
  let testRequest: Request;
  let testTask: Task;

  // Test file paths
  const testTasksPath = path.join(process.cwd(), 'tasks.json');
  const testBackupDir = path.join(process.cwd(), '.backups');
  const testLockPath = path.join(process.cwd(), '.tasks.lock');

  beforeAll(() => {
    // Setup test data
    testTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test task description',
      done: false,
      approved: false,
      completedDetails: ''
    };

    testRequest = {
      requestId: 'req-1',
      originalRequest: 'Test request',
      splitDetails: 'Test split details',
      tasks: [testTask],
      completed: false
    };

    testData = {
      requests: [testRequest]
    };
  });

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get fresh service instance
    service = TasksDataService.getInstance();
    
    // Reset service internal state
    (service as any).data = null;
    (service as any).lockFile = null;

    // Track written file contents for integrity checking
    const writtenFiles: Map<string, string> = new Map();

    // Setup default mock behaviors
    mockFs.pathExists.mockResolvedValue(true);
    
    // Mock readFile to return what was written or default test data
    mockFs.readFile.mockImplementation(async (filePath: string) => {
      const pathStr = typeof filePath === 'string' ? filePath : filePath.toString();
      if (writtenFiles.has(pathStr)) {
        return writtenFiles.get(pathStr)!;
      }
      // Default return for main tasks.json
      if (pathStr.includes('tasks.json') && !pathStr.includes('.tmp')) {
        return JSON.stringify(testData);
      }
      // For checksum files, return a valid checksum
      if (pathStr.includes('.checksum')) {
        const dataToHash = writtenFiles.get(pathStr.replace('.checksum', '')) || JSON.stringify(testData);
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
      }
      return JSON.stringify(testData);
    });
    
    // Mock writeFile to track what gets written
    mockFs.writeFile.mockImplementation(async (filePath: any, data: string) => {
      const pathStr = typeof filePath === 'string' ? filePath : filePath.toString();
      if (typeof filePath === 'number') {
        // For file descriptor writes (lock files)
        return undefined;
      }
      writtenFiles.set(pathStr, data);
      return undefined;
    });

    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.rename.mockImplementation(async (oldPath: string, newPath: string) => {
      // When renaming, move the content from old path to new path
      if (writtenFiles.has(oldPath)) {
        writtenFiles.set(newPath, writtenFiles.get(oldPath)!);
        writtenFiles.delete(oldPath);
      }
      return undefined;
    });
    mockFs.close.mockResolvedValue(undefined);
    mockFs.open.mockResolvedValue(1 as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Operations and Data Loading', () => {
    it('should load data successfully from existing file', async () => {
      const result = await service.loadData();
      
      expect(mockFs.pathExists).toHaveBeenCalledWith(testTasksPath);
      expect(mockFs.readFile).toHaveBeenCalledWith(testTasksPath, 'utf-8');
      expect(result).toEqual(testData);
    });

    it('should create initial file when tasks.json does not exist', async () => {
      mockFs.pathExists.mockResolvedValue(false);
      
      const result = await service.loadData();
      
      expect(result).toEqual({ requests: [] });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle empty file gracefully', async () => {
      // Mock empty file scenario
      mockFs.readFile.mockResolvedValue('');
      
      // Mock a backup file with valid content
      mockFs.readdir.mockResolvedValue(['tasks-2024-01-01.json'] as never);
      mockFs.readFile
        .mockResolvedValueOnce('') // First call for the main file (empty)
        .mockResolvedValueOnce(JSON.stringify({
          timestamp: '2024-01-01T00:00:00.000Z',
          checksum: 'valid-checksum',
          data: testData
        })); // Second call for the backup file
      
      const result = await service.loadData();
      
      expect(result).toEqual(testData);
      expect(mockFs.readdir).toHaveBeenCalledWith(expect.stringContaining('.backups'));
    });

    it('should handle invalid JSON with backup restoration', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.readdir.mockResolvedValue(['tasks-2024-01-01.json']);
      mockFs.readFile.mockResolvedValueOnce('invalid json').mockResolvedValueOnce(JSON.stringify({
        timestamp: '2024-01-01',
        checksum: 'valid-checksum',
        data: testData
      }));

      // Mock checksum calculation to return the expected checksum
      const originalCreateHash = require('crypto').createHash;
      vi.spyOn(require('crypto'), 'createHash').mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('valid-checksum')
      });

      const result = await service.loadData();
      
      expect(result).toEqual(testData);
      expect(mockFs.writeFile).toHaveBeenCalledWith(testTasksPath, JSON.stringify(testData, null, 2));
    });

    it('should throw ApiError when no valid backup is available', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      mockFs.readdir.mockResolvedValue([]);

      await expect(service.loadData()).rejects.toThrow(ApiError);
    });
  });

  describe('File Locking Mechanism', () => {
    it('should acquire and release lock successfully', async () => {
      mockFs.open.mockResolvedValue(1 as any);
      
      // Access private method for testing
      await (service as any).acquireLock();
      
      expect(mockFs.open).toHaveBeenCalledWith(testLockPath, 'wx');
      // Check that writeFile was called with the file descriptor and some JSON content
      expect(mockFs.writeFile).toHaveBeenCalledWith(1, expect.stringMatching(/\{[\s\S]*"host"[\s\S]*\}/));
      
      await (service as any).releaseLock();
      
      expect(mockFs.close).toHaveBeenCalledWith(1);
      expect(mockFs.unlink).toHaveBeenCalledWith(testLockPath);
    });

    it('should handle stale lock files', async () => {
      const staleDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      mockFs.open.mockRejectedValueOnce({ code: 'EEXIST' });
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({
        pid: 999,
        timestamp: staleDate,
        host: 'old-host'
      }));
      mockFs.open.mockResolvedValueOnce(1 as any);

      await (service as any).acquireLock();
      
      expect(mockFs.unlink).toHaveBeenCalledWith(testLockPath);
      expect(mockFs.open).toHaveBeenCalledTimes(2);
    });

    it('should timeout when lock cannot be acquired', async () => {
      mockFs.open.mockRejectedValue({ code: 'EEXIST' });
      // Mock readFile to return a recent timestamp so the lock appears fresh
      mockFs.readFile.mockResolvedValue(JSON.stringify({
        pid: 999,
        timestamp: new Date().toISOString(),
        host: 'other-host'
      }));

      // Mock timeout to be very short for testing
      const originalTimeout = 30000;
      (service as any).LOCK_TIMEOUT = 100;

      await expect((service as any).acquireLock()).rejects.toThrow('Timeout waiting for file lock');
      
      // Restore original timeout
      (service as any).LOCK_TIMEOUT = originalTimeout;
    }, 1000); // Set test timeout to 1 second
  });

  describe('Backup Management', () => {
    it('should create backup successfully', async () => {
      const mockChecksum = 'test-checksum-123';
      vi.spyOn(require('crypto'), 'createHash').mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(mockChecksum)
      });

      await (service as any).createBackup();
      
      expect(mockFs.ensureDir).toHaveBeenCalledWith(testBackupDir);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`${testBackupDir}/tasks-.*\\.json`)),
        expect.stringContaining(mockChecksum)
      );
    });

    it('should clean up old backups when limit exceeded', async () => {
      const mockBackupFiles = Array.from({ length: 15 }, (_, i) => 
        `tasks-2024-01-${String(i + 1).padStart(2, '0')}.json`
      );
      
      mockFs.readdir.mockResolvedValue(mockBackupFiles);
      
      await (service as any).cleanupOldBackups();
      
      expect(mockFs.unlink).toHaveBeenCalledTimes(5); // Should remove 5 oldest backups
    });

    it('should get backup status correctly', async () => {
      const backupFiles = [
        'tasks-2024-01-03.json',
        'tasks-2024-01-01.json',
        'tasks-2024-01-02.json',
        'other-file.txt'
      ];
      
      mockFs.readdir.mockResolvedValue(backupFiles);
      mockFs.pathExists.mockResolvedValue(true);
      
      const status = await service.getBackupStatus();
      
      expect(status.totalBackups).toBe(3);
      expect(status.latestBackup).toBe('tasks-2024-01-03.json');
      expect(status.backupDirectory).toBe(testBackupDir);
    });

    it('should create manual backup with proper metadata', async () => {
      const mockChecksum = 'manual-backup-checksum';
      vi.spyOn(require('crypto'), 'createHash').mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue(mockChecksum)
      });

      const backupPath = await service.createManualBackup();
      
      expect(backupPath).toMatch(/tasks-manual-.*\.json$/);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        backupPath,
        expect.stringContaining('"type": "manual"')
      );
    });
  });

  describe('Request CRUD Operations', () => {
    it('should get all requests successfully', async () => {
      const requests = await service.getAllRequests();
      
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        requestId: 'req-1',
        originalRequest: 'Test request',
        totalTasks: 1,
        completedTasks: 0,
        approvedTasks: 0,
        completionPercentage: 0,
        approvalPercentage: 0
      });
    });

    it('should get full request objects', async () => {
      const requests = await service.getAllFullRequests();
      
      expect(requests).toEqual([testRequest]);
    });

    it('should get single request by ID', async () => {
      const request = await service.getRequest('req-1');
      
      expect(request).toEqual(testRequest);
    });

    it('should return null for non-existent request', async () => {
      const request = await service.getRequest('non-existent');
      
      expect(request).toBeNull();
    });

    it('should create new request with auto-generated ID', async () => {
      const newRequestData = {
        originalRequest: 'New test request',
        splitDetails: 'New split details',
        tasks: [],
        completed: false
      };

      const result = await service.createRequest(newRequestData);
      
      expect(result.requestId).toBe('req-2');
      expect(result.originalRequest).toBe(newRequestData.originalRequest);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should update existing request', async () => {
      const updates = {
        originalRequest: 'Updated request',
        completed: true
      };

      const result = await service.updateRequest('req-1', updates);
      
      expect(result.originalRequest).toBe('Updated request');
      expect(result.completed).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when updating non-existent request', async () => {
      await expect(service.updateRequest('non-existent', {}))
        .rejects.toThrow(ApiError);
    });

    it('should delete request successfully', async () => {
      await service.deleteRequest('req-1');
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when deleting non-existent request', async () => {
      await expect(service.deleteRequest('non-existent'))
        .rejects.toThrow(ApiError);
    });
  });

  describe('Task CRUD Operations', () => {
    it('should get task successfully', async () => {
      const task = await service.getTask('req-1', 'task-1');
      
      expect(task).toEqual(testTask);
    });

    it('should return null for non-existent task', async () => {
      const task = await service.getTask('req-1', 'non-existent');
      
      expect(task).toBeNull();
    });

    it('should return null for task in non-existent request', async () => {
      const task = await service.getTask('non-existent', 'task-1');
      
      expect(task).toBeNull();
    });

    it('should create new task with auto-generated ID', async () => {
      const newTaskData = {
        title: 'New task',
        description: 'New task description',
        done: false,
        approved: false,
        completedDetails: ''
      };

      const result = await service.createTask('req-1', newTaskData);
      
      expect(result.id).toBe('task-2');
      expect(result.title).toBe(newTaskData.title);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when creating task in non-existent request', async () => {
      const newTaskData = {
        title: 'New task',
        description: 'New task description',
        done: false,
        approved: false,
        completedDetails: ''
      };

      await expect(service.createTask('non-existent', newTaskData))
        .rejects.toThrow(ApiError);
    });

    it('should update existing task', async () => {
      const updates = {
        title: 'Updated task',
        done: true,
        approved: true
      };

      const result = await service.updateTask('req-1', 'task-1', updates);
      
      expect(result.title).toBe('Updated task');
      expect(result.done).toBe(true);
      expect(result.approved).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when updating task in non-existent request', async () => {
      await expect(service.updateTask('non-existent', 'task-1', {}))
        .rejects.toThrow(ApiError);
    });

    it('should throw error when updating non-existent task', async () => {
      await expect(service.updateTask('req-1', 'non-existent', {}))
        .rejects.toThrow(ApiError);
    });

    it('should delete task successfully', async () => {
      await service.deleteTask('req-1', 'task-1');
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should throw error when deleting task from non-existent request', async () => {
      await expect(service.deleteTask('non-existent', 'task-1'))
        .rejects.toThrow(ApiError);
    });

    it('should throw error when deleting non-existent task', async () => {
      await expect(service.deleteTask('req-1', 'non-existent'))
        .rejects.toThrow(ApiError);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should validate request data before saving', async () => {
      const invalidRequestData = {
        originalRequest: '', // Invalid: empty string
        splitDetails: 'Test',
        tasks: [],
        completed: false
      };

      await expect(service.createRequest(invalidRequestData))
        .rejects.toThrow();
    });

    it('should validate task data before saving', async () => {
      const invalidTaskData = {
        title: '', // Invalid: empty string
        description: 'Test description',
        done: false,
        approved: false,
        completedDetails: ''
      };

      await expect(service.createTask('req-1', invalidTaskData))
        .rejects.toThrow();
    });

    it('should verify data integrity with checksum', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValueOnce('test content')
                      .mockResolvedValueOnce('test-checksum-123'); // Use same checksum as our global mock
      
      const isValid = await service.verifyDataIntegrity();
      
      expect(isValid).toBe(true);
    });

    it('should detect corrupted data with wrong checksum', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValueOnce('test content')
                      .mockResolvedValueOnce('stored-checksum');
      
      vi.spyOn(require('crypto'), 'createHash').mockReturnValue({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue('calculated-checksum')
      });

      const isValid = await service.verifyDataIntegrity();
      
      expect(isValid).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = TasksDataService.getInstance();
      const instance2 = TasksDataService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File system error'));
      
      await expect(service.loadData()).rejects.toThrow(ApiError);
    });

    it('should handle lock acquisition failures', async () => {
      mockFs.open.mockRejectedValue(new Error('Cannot create lock'));
      
      await expect((service as any).acquireLock()).rejects.toThrow(ApiError);
    });

    it('should handle backup creation failures gracefully', async () => {
      mockFs.ensureDir.mockRejectedValue(new Error('Cannot create backup dir'));
      
      // Should not throw, just log error
      await expect((service as any).createBackup()).resolves.toBeUndefined();
    });
  });
});
