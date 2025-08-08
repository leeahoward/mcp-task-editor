import { describe, it, expect } from 'vitest';

// Test the query parameter building utility function
function buildQueryParams(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
  });
  return search.toString();
}

// Test the filtering logic separately
function filterRequests(
  requests: any[], 
  query?: string, 
  completed?: boolean, 
  taskDone?: string, 
  taskApproved?: string
) {
  let filtered = [...requests];
  
  if (query) {
    const searchTerm = query.toLowerCase();
    filtered = filtered.filter((req: any) => 
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
    filtered = filtered.filter((req: any) => req.completed === completed);
  }

  if (taskDone === 'true') {
    filtered = filtered.filter((req: any) => req.tasks.some((t: any) => !!t.done));
  } else if (taskDone === 'false') {
    filtered = filtered.filter((req: any) => req.tasks.some((t: any) => !t.done));
  }

  if (taskApproved === 'true') {
    filtered = filtered.filter((req: any) => req.tasks.some((t: any) => !!t.approved));
  } else if (taskApproved === 'false') {
    filtered = filtered.filter((req: any) => req.tasks.some((t: any) => !t.approved));
  }
  
  return filtered;
}

// Test the sorting logic separately
function sortRequests(requests: any[], sortBy: string, sortOrder: string) {
  return requests.sort((a: any, b: any) => {
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
}

// Test the pagination logic separately
function paginateRequests(requests: any[], page: number, limit: number) {
  const total = requests.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedRequests = requests.slice(startIndex, endIndex);
  
  return {
    requests: paginatedRequests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: endIndex < total,
      hasPrev: page > 1
    }
  };
}

describe('Query Parameter Builder', () => {
  it('should build URL with single parameter', () => {
    const result = buildQueryParams({ page: 1 });
    expect(result).toBe('page=1');
  });

  it('should build URL with multiple parameters', () => {
    const result = buildQueryParams({ 
      page: 2, 
      limit: 10, 
      sortBy: 'completion', 
      sortOrder: 'desc' 
    });
    expect(result).toBe('page=2&limit=10&sortBy=completion&sortOrder=desc');
  });

  it('should handle boolean parameters', () => {
    const result = buildQueryParams({ 
      completed: true, 
      taskDone: false 
    });
    expect(result).toBe('completed=true&taskDone=false');
  });

  it('should exclude undefined, null, and empty string parameters', () => {
    const result = buildQueryParams({ 
      page: 1, 
      query: undefined, 
      completed: null, 
      sortBy: '', 
      limit: 20 
    });
    expect(result).toBe('page=1&limit=20');
  });

  it('should include zero and false values', () => {
    const result = buildQueryParams({ 
      page: 0, 
      completed: false 
    });
    expect(result).toBe('page=0&completed=false');
  });
});

describe('Request Filtering Logic', () => {
  const mockRequests = [
    {
      requestId: 'req-1',
      originalRequest: 'Test request 1',
      splitDetails: 'Test split details 1',
      completed: false,
      tasks: [
        { id: 'task-1', title: 'Task 1', description: 'Description 1', done: true, approved: false, completedDetails: '' },
        { id: 'task-2', title: 'Task 2', description: 'Description 2', done: false, approved: false, completedDetails: '' }
      ]
    },
    {
      requestId: 'req-2',
      originalRequest: 'Another test request',
      splitDetails: 'Another split details',
      completed: true,
      tasks: [
        { id: 'task-3', title: 'Task 3', description: 'Description 3', done: true, approved: true, completedDetails: 'Done' }
      ]
    },
    {
      requestId: 'req-3',
      originalRequest: 'Third test request',
      splitDetails: 'Third split details',
      completed: false,
      tasks: [
        { id: 'task-4', title: 'Task 4', description: 'Description 4', done: false, approved: false, completedDetails: '' },
        { id: 'task-5', title: 'Task 5', description: 'Description 5', done: false, approved: true, completedDetails: '' }
      ]
    }
  ];

  it('should filter by query text in originalRequest', () => {
    const result = filterRequests(mockRequests, 'third');
    expect(result).toHaveLength(1);
    expect(result[0].requestId).toBe('req-3');
  });

  it('should filter by query text in task title', () => {
    const result = filterRequests(mockRequests, 'task 3');
    expect(result).toHaveLength(1);
    expect(result[0].requestId).toBe('req-2');
  });

  it('should filter by completed status', () => {
    const result = filterRequests(mockRequests, undefined, true);
    expect(result).toHaveLength(1);
    expect(result[0].requestId).toBe('req-2');
  });

  it('should filter by taskDone=true', () => {
    const result = filterRequests(mockRequests, undefined, undefined, 'true');
    expect(result).toHaveLength(2); // req-1 and req-2 have done tasks
  });

  it('should filter by taskApproved=true', () => {
    const result = filterRequests(mockRequests, undefined, undefined, undefined, 'true');
    expect(result).toHaveLength(2); // req-2 and req-3 have approved tasks
  });

  it('should apply multiple filters', () => {
    const result = filterRequests(mockRequests, undefined, false, 'true');
    expect(result).toHaveLength(1); // Only req-1 is not completed but has done tasks
    expect(result[0].requestId).toBe('req-1');
  });
});

describe('Request Sorting Logic', () => {
  const mockRequests = [
    {
      requestId: 'req-3',
      originalRequest: 'Third test request',
      tasks: [
        { done: false, approved: false },
        { done: false, approved: true }
      ]
    },
    {
      requestId: 'req-1',
      originalRequest: 'Test request 1',
      tasks: [
        { done: true, approved: false },
        { done: false, approved: false }
      ]
    },
    {
      requestId: 'req-2',
      originalRequest: 'Another test request',
      tasks: [
        { done: true, approved: true }
      ]
    }
  ];

  it('should sort by requestId ascending', () => {
    const result = sortRequests([...mockRequests], 'requestId', 'asc');
    expect(result.map(r => r.requestId)).toEqual(['req-1', 'req-2', 'req-3']);
  });

  it('should sort by requestId descending', () => {
    const result = sortRequests([...mockRequests], 'requestId', 'desc');
    expect(result.map(r => r.requestId)).toEqual(['req-3', 'req-2', 'req-1']);
  });

  it('should sort by completion percentage', () => {
    const result = sortRequests([...mockRequests], 'completion', 'asc');
    // req-3: 0% (0/2), req-1: 50% (1/2), req-2: 100% (1/1)
    expect(result.map(r => r.requestId)).toEqual(['req-3', 'req-1', 'req-2']);
  });

  it('should sort by task count', () => {
    const result = sortRequests([...mockRequests], 'tasks', 'desc');
    // req-1: 2 tasks, req-3: 2 tasks, req-2: 1 task
    expect(result[2].requestId).toBe('req-2');
  });

  it('should sort by originalRequest text', () => {
    const result = sortRequests([...mockRequests], 'originalRequest', 'asc');
    // "Another test request", "Test request 1", "Third test request"
    expect(result.map(r => r.requestId)).toEqual(['req-2', 'req-1', 'req-3']);
  });
});

describe('Pagination Logic', () => {
  const mockRequests = [
    { requestId: 'req-1' },
    { requestId: 'req-2' },
    { requestId: 'req-3' },
    { requestId: 'req-4' },
    { requestId: 'req-5' }
  ];

  it('should return correct pagination metadata for first page', () => {
    const result = paginateRequests(mockRequests, 1, 2);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    });
    expect(result.requests).toHaveLength(2);
    expect(result.requests.map(r => r.requestId)).toEqual(['req-1', 'req-2']);
  });

  it('should return correct data for middle page', () => {
    const result = paginateRequests(mockRequests, 2, 2);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNext: true,
      hasPrev: true
    });
    expect(result.requests.map(r => r.requestId)).toEqual(['req-3', 'req-4']);
  });

  it('should return correct data for last page', () => {
    const result = paginateRequests(mockRequests, 3, 2);
    expect(result.pagination).toEqual({
      page: 3,
      limit: 2,
      total: 5,
      totalPages: 3,
      hasNext: false,
      hasPrev: true
    });
    expect(result.requests.map(r => r.requestId)).toEqual(['req-5']);
  });

  it('should handle page beyond available data', () => {
    const result = paginateRequests(mockRequests, 5, 2);
    expect(result.requests).toHaveLength(0);
    expect(result.pagination.hasNext).toBe(false);
    expect(result.pagination.hasPrev).toBe(true);
  });
});
