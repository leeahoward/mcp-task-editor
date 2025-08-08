import { Request, Task, RequestSummary, TaskSummary, SearchFilters } from '@/types';

/**
 * Calculate completion statistics for a request
 */
export function calculateRequestStats(request: Request): RequestSummary {
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
}

/**
 * Create a task summary for display
 */
export function createTaskSummary(task: Task): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    approved: task.approved,
    hasDetails: task.completedDetails.trim().length > 0
  };
}

/**
 * Filter requests based on search criteria
 */
export function filterRequests(requests: RequestSummary[], filters: SearchFilters): RequestSummary[] {
  return requests.filter(request => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const matchesText = request.originalRequest.toLowerCase().includes(query) ||
                         request.requestId.toLowerCase().includes(query);
      if (!matchesText) return false;
    }

    // Completion filter
    if (filters.completed !== undefined && filters.completed !== null) {
      if (request.completed !== filters.completed) return false;
    }

    return true;
  });
}

/**
 * Filter tasks based on search criteria
 */
export function filterTasks(tasks: TaskSummary[], filters: SearchFilters): TaskSummary[] {
  return tasks.filter(task => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const matchesText = task.title.toLowerCase().includes(query) ||
                         task.id.toLowerCase().includes(query);
      if (!matchesText) return false;
    }

    // Completion filter
    if (filters.completed !== undefined && filters.completed !== null) {
      if (task.done !== filters.completed) return false;
    }

    // Approval filter
    if (filters.approved !== undefined && filters.approved !== null) {
      if (task.approved !== filters.approved) return false;
    }

    // Has details filter
    if (filters.hasDetails !== undefined && filters.hasDetails !== null) {
      if (task.hasDetails !== filters.hasDetails) return false;
    }

    return true;
  });
}

/**
 * Sort requests by specified criteria
 */
export function sortRequests(requests: RequestSummary[], field: string, direction: 'asc' | 'desc'): RequestSummary[] {
  const sorted = [...requests].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (field) {
      case 'title':
        valueA = a.originalRequest.toLowerCase();
        valueB = b.originalRequest.toLowerCase();
        break;
      case 'completion':
        valueA = a.completionPercentage;
        valueB = b.completionPercentage;
        break;
      default:
        valueA = a.requestId;
        valueB = b.requestId;
    }

    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Sort tasks by specified criteria
 */
export function sortTasks(tasks: TaskSummary[], field: string, direction: 'asc' | 'desc'): TaskSummary[] {
  const sorted = [...tasks].sort((a, b) => {
    let valueA: any;
    let valueB: any;

    switch (field) {
      case 'title':
        valueA = a.title.toLowerCase();
        valueB = b.title.toLowerCase();
        break;
      default:
        valueA = a.id;
        valueB = b.id;
    }

    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Format a percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}

/**
 * Get status color class based on completion percentage
 */
export function getStatusColor(percentage: number): string {
  if (percentage === 100) return 'text-green-600';
  if (percentage >= 75) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage > 0) return 'text-orange-600';
  return 'text-gray-600';
}

/**
 * Get progress bar color class based on completion percentage
 */
export function getProgressColor(percentage: number): string {
  if (percentage === 100) return 'bg-green-500';
  if (percentage >= 75) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  if (percentage > 0) return 'bg-orange-500';
  return 'bg-gray-300';
}

/**
 * Validate and format request/task data
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a human-readable date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
