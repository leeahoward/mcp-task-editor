import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, extractRequestBody } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { RequestSchema } from '@/schemas/validation';
import { RequestFormData, Request } from '@/types';
import { generateId } from '@/utils/api';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/requests - List all requests with optional search and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Extract query parameters
    const query = searchParams.get('query') || undefined;
    const completed = searchParams.get('completed') ? searchParams.get('completed') === 'true' : undefined;
    const taskDone = searchParams.get('taskDone'); // 'true' | 'false' | null
    const taskApproved = searchParams.get('taskApproved'); // 'true' | 'false' | null
    const sortBy = searchParams.get('sortBy') || 'requestId';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all requests
    const allRequests = await dataService.getAllFullRequests();
    
    // Apply filtering
    let filteredRequests = allRequests;
    
    if (query) {
      const searchTerm = query.toLowerCase();
      filteredRequests = filteredRequests.filter((req: Request) => 
        req.originalRequest.toLowerCase().includes(searchTerm) ||
        req.splitDetails.toLowerCase().includes(searchTerm) ||
        req.requestId.toLowerCase().includes(searchTerm) ||
        req.tasks.some((task: any) => 
          task.title.toLowerCase().includes(searchTerm) ||
          task.description.toLowerCase().includes(searchTerm)
        )
      );
    }
    
    if (completed !== undefined) {
      filteredRequests = filteredRequests.filter((req: Request) => req.completed === completed);
    }

    // Optional filters for presence of tasks with done/approved state
    if (taskDone === 'true') {
      filteredRequests = filteredRequests.filter((req: Request) => req.tasks.some((t: any) => !!t.done));
    } else if (taskDone === 'false') {
      filteredRequests = filteredRequests.filter((req: Request) => req.tasks.some((t: any) => !t.done));
    }

    if (taskApproved === 'true') {
      filteredRequests = filteredRequests.filter((req: Request) => req.tasks.some((t: any) => !!t.approved));
    } else if (taskApproved === 'false') {
      filteredRequests = filteredRequests.filter((req: Request) => req.tasks.some((t: any) => !t.approved));
    }
    
    // Apply sorting
    filteredRequests.sort((a: Request, b: Request) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'completion':
          aValue = a.tasks.filter((t: any) => t.done).length / Math.max(a.tasks.length, 1);
          bValue = b.tasks.filter((t: any) => t.done).length / Math.max(b.tasks.length, 1);
          break;
        case 'tasks':
          aValue = a.tasks.length;
          bValue = b.tasks.length;
          break;
        case 'originalRequest':
          aValue = a.originalRequest.toLowerCase();
          bValue = b.originalRequest.toLowerCase();
          break;
        default:
          aValue = a.requestId;
          bValue = b.requestId;
      }
      
      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    // Apply pagination
    const total = filteredRequests.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRequests = filteredRequests.slice(startIndex, endIndex);
    
    // Calculate summary statistics for each request
    const requestSummaries = paginatedRequests.map((req: Request) => {
      const totalTasks = req.tasks.length;
      const completedTasks = req.tasks.filter((t: any) => t.done).length;
      const approvedTasks = req.tasks.filter((t: any) => t.approved).length;
      
      return {
        ...req,
        totalTasks,
        completedTasks,
        approvedTasks,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        approvalPercentage: totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
      };
    });

    return createSuccessResponse({
      requests: requestSummaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/requests - Create a new request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await extractRequestBody<RequestFormData>(request);
    
    // Validate the request data
    const validatedData = RequestSchema.omit({ 
      requestId: true, 
      tasks: true 
    }).parse(body);
    
    // Get existing requests to generate a unique ID
    const existingRequests = await dataService.getAllRequests();
    const existingIds = existingRequests.map(r => r.requestId);
    const newRequestId = generateId('req', existingIds);
    
    // Create the new request
    const newRequest = {
      requestId: newRequestId,
      originalRequest: validatedData.originalRequest,
      splitDetails: validatedData.splitDetails,
      completed: validatedData.completed || false,
      tasks: []
    };
    
    // Save the request
    const createdRequest = await dataService.createRequest(newRequest);
    
    return createSuccessResponse(createdRequest, 'Request created successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
