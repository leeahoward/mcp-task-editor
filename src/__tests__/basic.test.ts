import { describe, it, expect } from 'vitest';

describe('Basic functionality tests', () => {
  describe('Query parameter building', () => {
    it('should build URL parameters correctly', () => {
      const params = { page: 1, limit: 20, query: 'test' };
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) {
          searchParams.set(k, String(v));
        }
      });
      
      const result = searchParams.toString();
      expect(result).toBe('page=1&limit=20&query=test');
    });

    it('should filter out undefined and empty parameters', () => {
      const params = { page: 1, query: undefined, limit: '', sortBy: 'requestId' };
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) {
          searchParams.set(k, String(v));
        }
      });
      
      const result = searchParams.toString();
      expect(result).toBe('page=1&sortBy=requestId');
    });

    it('should handle boolean parameters', () => {
      const params = { completed: true, taskDone: false };
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) {
          searchParams.set(k, String(v));
        }
      });
      
      const result = searchParams.toString();
      expect(result).toBe('completed=true&taskDone=false');
    });
  });

  describe('Data filtering logic', () => {
    const mockRequests = [
      {
        requestId: 'req-1',
        originalRequest: 'Test request 1',
        completed: false,
        tasks: [
          { done: true, approved: false },
          { done: false, approved: false }
        ]
      },
      {
        requestId: 'req-2',
        originalRequest: 'Another test request',
        completed: true,
        tasks: [
          { done: true, approved: true }
        ]
      }
    ];

    it('should filter by completed status', () => {
      const filtered = mockRequests.filter(req => req.completed === true);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].requestId).toBe('req-2');
    });

    it('should filter by search query', () => {
      const query = 'another';
      const filtered = mockRequests.filter(req => 
        req.originalRequest.toLowerCase().includes(query.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].requestId).toBe('req-2');
    });

    it('should filter by taskDone', () => {
      const filtered = mockRequests.filter(req => 
        req.tasks.some(task => task.done === true)
      );
      expect(filtered).toHaveLength(2); // Both have at least one done task
    });
  });

  describe('Sorting logic', () => {
    const mockRequests = [
      { requestId: 'req-3', tasks: [{ done: false }, { done: false }] },
      { requestId: 'req-1', tasks: [{ done: true }, { done: false }] },
      { requestId: 'req-2', tasks: [{ done: true }] }
    ];

    it('should sort by requestId ascending', () => {
      const sorted = [...mockRequests].sort((a, b) => 
        a.requestId.localeCompare(b.requestId)
      );
      expect(sorted[0].requestId).toBe('req-1');
      expect(sorted[1].requestId).toBe('req-2');
      expect(sorted[2].requestId).toBe('req-3');
    });

    it('should sort by completion percentage', () => {
      const sorted = [...mockRequests].sort((a, b) => {
        const aCompletion = a.tasks.filter(t => t.done).length / a.tasks.length;
        const bCompletion = b.tasks.filter(t => t.done).length / b.tasks.length;
        return aCompletion - bCompletion;
      });
      
      // req-3: 0%, req-1: 50%, req-2: 100%
      expect(sorted[0].requestId).toBe('req-3');
      expect(sorted[1].requestId).toBe('req-1');
      expect(sorted[2].requestId).toBe('req-2');
    });
  });

  describe('Pagination logic', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    it('should calculate pagination correctly', () => {
      const page = 2;
      const limit = 10;
      const total = items.length;
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);
      
      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      };
      
      expect(paginatedItems).toHaveLength(10);
      expect(paginatedItems[0].id).toBe(11);
      expect(pagination.totalPages).toBe(3);
      expect(pagination.hasNext).toBe(true);
      expect(pagination.hasPrev).toBe(true);
    });

    it('should handle last page correctly', () => {
      const page = 3;
      const limit = 10;
      const total = items.length;
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);
      
      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      };
      
      expect(paginatedItems).toHaveLength(5); // Remaining items
      expect(pagination.hasNext).toBe(false);
      expect(pagination.hasPrev).toBe(true);
    });
  });
});
