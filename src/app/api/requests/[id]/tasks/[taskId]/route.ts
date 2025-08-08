import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, extractRequestBody, extractParams } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { TaskSchema } from '@/schemas/validation';
import { TaskFormData } from '@/types';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/requests/[id]/tasks/[taskId] - Get a single task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const { id: requestId, taskId } = extractParams(params);
    
    if (!requestId || !taskId) {
      return createErrorResponse('Request ID and Task ID are required', 400);
    }
    
    const task = await dataService.getTask(requestId, taskId);
    
    if (!task) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Add summary information
    const taskWithSummary = {
      ...task,
      hasDetails: task.completedDetails.trim().length > 0
    };
    
    return createSuccessResponse(taskWithSummary);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/requests/[id]/tasks/[taskId] - Update a task
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const { id: requestId, taskId } = extractParams(params);
    
    if (!requestId || !taskId) {
      return createErrorResponse('Request ID and Task ID are required', 400);
    }
    
    const body = await extractRequestBody<Partial<TaskFormData>>(request);
    
    // Validate the update data (allow partial updates)
    const validatedData = TaskSchema.omit({ id: true }).partial().parse(body);
    
    // Update the task
    const updatedTask = await dataService.updateTask(requestId, taskId, validatedData);
    
    return createSuccessResponse(updatedTask, 'Task updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/requests/[id]/tasks/[taskId] - Delete a task
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const { id: requestId, taskId } = extractParams(params);
    
    if (!requestId || !taskId) {
      return createErrorResponse('Request ID and Task ID are required', 400);
    }
    
    // Check if task exists
    const existingTask = await dataService.getTask(requestId, taskId);
    if (!existingTask) {
      return createErrorResponse('Task not found', 404);
    }
    
    // Delete the task
    await dataService.deleteTask(requestId, taskId);
    
    return createSuccessResponse(
      { requestId, taskId }, 
      'Task deleted successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
