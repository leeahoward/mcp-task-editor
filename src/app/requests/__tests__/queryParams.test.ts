/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Extract the fetchRequests function for testing
async function fetchRequests(params: Record<string, string | number | boolean>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
  });
  const res = await fetch(`/api/requests?${search.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load requests');
  const json = await res.json();
  return json.data as { requests: any[]; pagination: any };
}

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Query Parameter Builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          requests: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        }
      })
    });
  });

  describe('Basic parameter handling', () => {
    it('should build URL with single parameter', async () => {
      await fetchRequests({ page: 1 });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=1',
        { cache: 'no-store' }
      );
    });

    it('should build URL with multiple parameters', async () => {
      await fetchRequests({ 
        page: 2, 
        limit: 10, 
        sortBy: 'completion', 
        sortOrder: 'desc' 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=2&limit=10&sortBy=completion&sortOrder=desc',
        { cache: 'no-store' }
      );
    });

    it('should handle boolean parameters', async () => {
      await fetchRequests({ 
        completed: true, 
        taskDone: false 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?completed=true&taskDone=false',
        { cache: 'no-store' }
      );
    });

    it('should handle string parameters with special characters', async () => {
      await fetchRequests({ 
        query: 'test & example', 
        sortBy: 'originalRequest' 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?query=test+%26+example&sortBy=originalRequest',
        { cache: 'no-store' }
      );
    });
  });

  describe('Parameter filtering', () => {
    it('should exclude undefined parameters', async () => {
      await fetchRequests({ 
        page: 1, 
        query: undefined, 
        limit: 20 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=1&limit=20',
        { cache: 'no-store' }
      );
    });

    it('should exclude empty string parameters', async () => {
      await fetchRequests({ 
        page: 1, 
        query: '', 
        sortBy: 'requestId' 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=1&sortBy=requestId',
        { cache: 'no-store' }
      );
    });

    it('should exclude null parameters', async () => {
      await fetchRequests({ 
        page: 1, 
        completed: null, 
        limit: 20 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=1&limit=20',
        { cache: 'no-store' }
      );
    });

    it('should include zero values', async () => {
      await fetchRequests({ 
        page: 0, 
        limit: 0 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=0&limit=0',
        { cache: 'no-store' }
      );
    });

    it('should include false boolean values', async () => {
      await fetchRequests({ 
        completed: false, 
        taskDone: false 
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?completed=false&taskDone=false',
        { cache: 'no-store' }
      );
    });
  });

  describe('Real-world parameter combinations', () => {
    it('should build complete search and filter URL', async () => {
      await fetchRequests({
        query: 'test request',
        completed: false,
        taskDone: true,
        taskApproved: false,
        sortBy: 'completion',
        sortOrder: 'desc',
        page: 2,
        limit: 10
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?query=test+request&completed=false&taskDone=true&taskApproved=false&sortBy=completion&sortOrder=desc&page=2&limit=10',
        { cache: 'no-store' }
      );
    });

    it('should handle pagination-only requests', async () => {
      await fetchRequests({
        page: 3,
        limit: 50
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=3&limit=50',
        { cache: 'no-store' }
      );
    });

    it('should handle sorting-only requests', async () => {
      await fetchRequests({
        sortBy: 'tasks',
        sortOrder: 'asc'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?sortBy=tasks&sortOrder=asc',
        { cache: 'no-store' }
      );
    });

    it('should handle search-only requests', async () => {
      await fetchRequests({
        query: 'specific task'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?query=specific+task',
        { cache: 'no-store' }
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty parameters object', async () => {
      await fetchRequests({});
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?',
        { cache: 'no-store' }
      );
    });

    it('should handle parameters with only excluded values', async () => {
      await fetchRequests({
        query: undefined,
        completed: null,
        taskDone: '',
        page: undefined
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?',
        { cache: 'no-store' }
      );
    });

    it('should handle numeric strings', async () => {
      await fetchRequests({
        page: '5',
        limit: '25'
      } as any);
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?page=5&limit=25',
        { cache: 'no-store' }
      );
    });

    it('should handle URL encoding for complex queries', async () => {
      await fetchRequests({
        query: 'task: implement & test "feature"',
        sortBy: 'originalRequest'
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/requests?query=task%3A+implement+%26+test+%22feature%22&sortBy=originalRequest',
        { cache: 'no-store' }
      );
    });
  });

  describe('Error handling', () => {
    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(fetchRequests({ page: 1 })).rejects.toThrow('Failed to load requests');
    });

    it('should throw error when network fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(fetchRequests({ page: 1 })).rejects.toThrow('Network error');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(fetchRequests({ page: 1 })).rejects.toThrow('Invalid JSON');
    });
  });
});
