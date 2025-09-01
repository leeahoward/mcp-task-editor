import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, extractRequestBody, extractParams } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { TaskSchema } from '@/schemas/validation';
import { TaskFormData, Task } from '@/types';
import { generateId } from '@/utils/api';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/requests/[id]/tasks - Get all tasks for a request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await extractParams(params);
    
    if (!requestId) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    const requestData = await dataService.getRequest(requestId);
    
    if (!requestData) {
      return createErrorResponse('Request not found', 404);
    }
    
    // Add summary information to each task
    const tasksWithSummary = requestData.tasks.map((task: Task) => ({
      ...task,
      hasDetails: task.completedDetails.trim().length > 0
    }));
    
    return createSuccessResponse({
      requestId,
      tasks: tasksWithSummary,
      totalTasks: tasksWithSummary.length,
      completedTasks: tasksWithSummary.filter((t: Task) => t.done).length,
      approvedTasks: tasksWithSummary.filter((t: Task) => t.approved).length
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/requests/[id]/tasks - Create a new task for a request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await extractParams(params);
    
    if (!requestId) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    const body = await extractRequestBody<TaskFormData>(request);
    
    // Validate the task data
    const validatedData = TaskSchema.omit({ id: true }).parse(body);
    
    // Check if request exists
    const requestData = await dataService.getRequest(requestId);
    if (!requestData) {
      return createErrorResponse('Request not found', 404);
    }
    
    // Generate a unique task ID
    const existingTaskIds = requestData.tasks.map((t: Task) => t.id);
    const newTaskId = generateId('task', existingTaskIds);
    
    // Create the new task
    const newTask = {
      id: newTaskId,
      ...validatedData
    };
    
    // Add task to request
    const updatedTask = await dataService.createTask(requestId, newTask);
    
    return createSuccessResponse(updatedTask, 'Task created successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
