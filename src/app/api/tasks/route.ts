import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, extractRequestBody } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { TaskSchema } from '@/schemas/validation';
import { TaskFormData, Task, Request } from '@/types';
import { generateId } from '@/utils/api';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/tasks - Get all tasks across all requests with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Extract query parameters
    const query = searchParams.get('query') || undefined;
    const done = searchParams.get('done') ? searchParams.get('done') === 'true' : undefined;
    const approved = searchParams.get('approved') ? searchParams.get('approved') === 'true' : undefined;
    const requestId = searchParams.get('requestId') || undefined;
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get all requests
    const allRequests = await dataService.getAllFullRequests();
    
    // Flatten all tasks with request context
    let allTasks = allRequests.flatMap((req: Request) => 
      req.tasks.map((task: Task) => ({
        ...task,
        requestId: req.requestId,
        requestTitle: req.originalRequest,
        hasDetails: task.completedDetails.trim().length > 0
      }))
    );
    
    // Apply filtering
    if (query) {
      const searchTerm = query.toLowerCase();
      allTasks = allTasks.filter((task: any) => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.completedDetails.toLowerCase().includes(searchTerm) ||
        task.requestTitle.toLowerCase().includes(searchTerm)
      );
    }
    
    if (done !== undefined) {
      allTasks = allTasks.filter((task: any) => task.done === done);
    }
    
    if (approved !== undefined) {
      allTasks = allTasks.filter((task: any) => task.approved === approved);
    }
    
    if (requestId) {
      allTasks = allTasks.filter((task: any) => task.requestId === requestId);
    }
    
    // Apply sorting
    allTasks.sort((a: any, b: any) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'done':
          aValue = a.done ? 1 : 0;
          bValue = b.done ? 1 : 0;
          break;
        case 'approved':
          aValue = a.approved ? 1 : 0;
          bValue = b.approved ? 1 : 0;
          break;
        case 'requestTitle':
          aValue = a.requestTitle.toLowerCase();
          bValue = b.requestTitle.toLowerCase();
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    // Apply pagination
    const total = allTasks.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = allTasks.slice(startIndex, endIndex);

    return createSuccessResponse({
      tasks: paginatedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      },
      summary: {
        totalTasks: total,
        completedTasks: allTasks.filter((t: any) => t.done).length,
        approvedTasks: allTasks.filter((t: any) => t.approved).length,
        pendingTasks: allTasks.filter((t: any) => !t.done).length
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/tasks - Create a new task (requires requestId in body)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await extractRequestBody<TaskFormData & { requestId: string }>(request);
    
    if (!body.requestId) {
      return createErrorResponse('Request ID is required', 400);
    }
    
    // Validate the task data
    const validatedData = TaskSchema.omit({ id: true }).parse(body);
    
    // Check if request exists
    const requestData = await dataService.getRequest(body.requestId);
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
    const updatedTask = await dataService.createTask(body.requestId, newTask);
    
    return createSuccessResponse(
      { ...updatedTask, requestId: body.requestId }, 
      'Task created successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
