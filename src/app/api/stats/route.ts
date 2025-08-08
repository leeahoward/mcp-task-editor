import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/utils/api';
import { TasksDataService } from '@/services/tasksDataService';
import { Request, Task } from '@/types';

const dataService = TasksDataService.getInstance();

/**
 * GET /api/stats - Get overall statistics about requests and tasks
 */
export async function GET(request: NextRequest) {
  try {
    const allRequests = await dataService.getAllFullRequests();
    
    // Calculate overall statistics
    const totalRequests = allRequests.length;
    const completedRequests = allRequests.filter((r: Request) => r.completed).length;
    const pendingRequests = totalRequests - completedRequests;
    
    // Task statistics
    const allTasks = allRequests.flatMap((r: Request) => r.tasks);
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: Task) => t.done).length;
    const approvedTasks = allTasks.filter((t: Task) => t.approved).length;
    const pendingTasks = totalTasks - completedTasks;
    
    // Calculate completion rates
    const requestCompletionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const taskApprovalRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
    
    // Tasks by status
    const tasksAwaitingApproval = allTasks.filter((t: Task) => t.done && !t.approved).length;
    const tasksInProgress = allTasks.filter((t: Task) => !t.done).length;
    
    // Request statistics by completion percentage
    const requestsByCompletion = allRequests.map((req: Request) => {
      const taskCount = req.tasks.length;
      const completedCount = req.tasks.filter((t: Task) => t.done).length;
      const completionPercentage = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;
      
      return {
        requestId: req.requestId,
        title: req.originalRequest.substring(0, 100) + (req.originalRequest.length > 100 ? '...' : ''),
        totalTasks: taskCount,
        completedTasks: completedCount,
        completionPercentage,
        completed: req.completed
      };
    }).sort((a: any, b: any) => b.completionPercentage - a.completionPercentage);
    
    // Top performers (requests with high completion rates)
    const topPerformers = requestsByCompletion.slice(0, 10);
    
    // Recent activity (tasks with completion details)
    const recentActivity = allTasks
      .filter((t: Task) => t.done && t.completedDetails.trim().length > 0)
      .map((t: Task) => {
        const parentRequest = allRequests.find((r: Request) => r.tasks.some((task: Task) => task.id === t.id));
        return {
          taskId: t.id,
          taskTitle: t.title,
          requestId: parentRequest?.requestId || '',
          requestTitle: parentRequest?.originalRequest.substring(0, 50) + '...' || '',
          approved: t.approved,
          completedDetails: t.completedDetails.substring(0, 200) + (t.completedDetails.length > 200 ? '...' : '')
        };
      })
      .slice(0, 20);

    return createSuccessResponse({
      overview: {
        totalRequests,
        completedRequests,
        pendingRequests,
        requestCompletionRate,
        totalTasks,
        completedTasks,
        approvedTasks,
        pendingTasks,
        tasksAwaitingApproval,
        tasksInProgress,
        taskCompletionRate,
        taskApprovalRate
      },
      requestsByCompletion,
      topPerformers,
      recentActivity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}
