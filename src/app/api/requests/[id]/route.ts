import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, extractRequestBody, extractParams } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { RequestSchema } from '@/schemas/validation';
import { RequestFormData, Task } from '@/types';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/requests/[id] - Get a single request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await extractParams(params);
    
    if (!id) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    const requestData = await dataService.getRequest(id);
    
    if (!requestData) {
      return createErrorResponse('Request not found', 404);
    }
    
    // Calculate summary statistics
    const totalTasks = requestData.tasks.length;
    const completedTasks = requestData.tasks.filter((t: Task) => t.done).length;
    const approvedTasks = requestData.tasks.filter((t: Task) => t.approved).length;
    
    const requestWithStats = {
      ...requestData,
      totalTasks,
      completedTasks,
      approvedTasks,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      approvalPercentage: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
    };
    
    return createSuccessResponse(requestWithStats);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/requests/[id] - Update a request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await extractParams(params);
    
    if (!id) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    const body = await extractRequestBody<Partial<RequestFormData>>(request);
    
    // Validate the update data (allow partial updates)
    const validatedData = RequestSchema.omit({ 
      requestId: true, 
      tasks: true 
    }).partial().parse(body);
    
    // Update the request
    const updatedRequest = await dataService.updateRequest(id, validatedData);
    
    return createSuccessResponse(updatedRequest, 'Request updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/requests/[id] - Delete a request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await extractParams(params);
    
    if (!id) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    // Check if request exists
    const existingRequest = await dataService.getRequest(id);
    if (!existingRequest) {
      return createErrorResponse('Request not found', 404);
    }
    
    // Delete the request
    await dataService.deleteRequest(id);
    
    return createSuccessResponse(
      { requestId: id }, 
      'Request deleted successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
