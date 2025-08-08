'use client';
import RequestCard from '@/components/cards/RequestCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorDisplay, getErrorMessage } from '@/components/ErrorDisplay';
import { FallbackUI } from '@/components/FallbackUI';
import { useAsyncOperation } from '@/hooks/useErrorHandler';
import { useEffect, useMemo, useState } from 'react';
import type { RequestSummary } from '@/types';

export const dynamic = 'force-dynamic';

async function fetchRequests(params: Record<string, string | number | boolean>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) search.set(k, String(v));
  });
  const res = await fetch(`/api/requests?${search.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load requests');
  const json = await res.json();
  return json.data as { requests: RequestSummary[]; pagination: any };
}

export default function RequestsPage() {
  const [query, setQuery] = useState('');
  const [completed, setCompleted] = useState<string>('all'); // 'all' | 'true' | 'false'
  const [sortBy, setSortBy] = useState('requestId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  
  // Use the error handling hook for the main data loading
  const { 
    isLoading: loadingRequests, 
    error: loadError, 
    execute: loadRequests,
    clearError
  } = useAsyncOperation<{ requests: RequestSummary[]; pagination: any }>();

  // Use the error handling hook for delete operations
  const { 
    isLoading: deleting, 
    error: deleteError, 
    execute: executeDelete,
    clearError: clearDeleteError
  } = useAsyncOperation<void>();

  const load = async () => {
    clearError();
    try {
      const params: Record<string, string | number | boolean> = { 
        page,
        limit: pageSize,
        sortBy, 
        sortOrder 
      };
      
      if (query) params.query = query;
      if (completed !== 'all') params.completed = completed === 'true';
      
      const data = await loadRequests(() => fetchRequests(params));
      setRequests(data.requests);
      setPagination(data.pagination);
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to load requests:', error);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortOrder, completed]);

  useEffect(() => {
    // Reset to page 1 when search query changes
    if (page !== 1) {
      setPage(1);
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const onDeleteAction = async (id: string) => {
    setConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!confirmId) return;
    
    clearDeleteError();
    
    try {
      await executeDelete(async () => {
        const res = await fetch(`/api/requests/${confirmId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to delete request: ${errorText}`);
        }
      });
      
      // If successful, reload the data
      await load();
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to delete request:', error);
    } finally {
      setConfirmId(null);
    }
  };

  const handleSelectToggle = (requestId: string, selected: boolean) => {
    const newSelected = new Set(selectedRequestIds);
    if (selected) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequestIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRequestIds.size === requests.length) {
      // Deselect all
      setSelectedRequestIds(new Set());
    } else {
      // Select all current page requests
      setSelectedRequestIds(new Set(requests.map(r => r.requestId)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRequestIds.size === 0) return;
    
    console.log('🗑️ BULK DELETE START', {
      selectedCount: selectedRequestIds.size,
      selectedIds: Array.from(selectedRequestIds),
      currentRequestCount: requests.length
    });
    
    clearDeleteError();
    
    try {
      await executeDelete(async () => {
        console.log('🔄 Starting sequential deletion requests...');
        
        // Delete all selected requests sequentially to avoid race conditions
        const selectedIds = Array.from(selectedRequestIds);
        const results: Array<{status: 'fulfilled', value: {id: string, response: Response}} | {status: 'rejected', reason: any}> = [];
        
        for (let index = 0; index < selectedIds.length; index++) {
          const id = selectedIds[index];
          console.log(`🎯 [${index + 1}/${selectedIds.length}] Deleting ${id} sequentially...`);
          
          try {
            const response = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
            console.log(`📡 [${index + 1}/${selectedIds.length}] Response for ${id}:`, {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok
            });
            
            results.push({
              status: 'fulfilled',
              value: { id, response }
            });
          } catch (error) {
            console.log(`❌ [${index + 1}/${selectedIds.length}] Error deleting ${id}:`, error);
            results.push({
              status: 'rejected',
              reason: error
            });
          }
        }
        
        console.log('✅ Sequential deletion completed');
        
        console.log('📊 Sequential deletion results:', results.map((result, index) => ({
          index: index + 1,
          status: result.status,
          id: selectedIds[index],
          value: result.status === 'fulfilled' ? {
            id: result.value.id,
            responseOk: result.value.response.ok,
            responseStatus: result.value.response.status
          } : undefined,
          reason: result.status === 'rejected' ? result.reason : undefined
        })));
        
        // Check if any requests failed to delete
        const failures = results.filter(result => result.status === 'rejected');
        const httpFailures = results.filter(result => 
          result.status === 'fulfilled' && !result.value.response.ok
        );
        
        console.log('❌ Failures summary:', {
          rejectedPromises: failures.length,
          httpFailures: httpFailures.length,
          totalFailures: failures.length + httpFailures.length
        });
        
        if (failures.length > 0 || httpFailures.length > 0) {
          throw new Error(`Failed to delete ${failures.length + httpFailures.length} request(s)`);
        }
        
        console.log('✅ All sequential deletions completed successfully');
      });
      
      console.log('🔄 Clearing selection and reloading data...');
      
      // If successful, clear selection and reload data
      setSelectedRequestIds(new Set());
      setShowBulkActions(false);
      await load();
      
      console.log('🎉 Bulk delete operation completed successfully');
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to delete requests:', error);
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  const filtered = useMemo(() => {
    // Since we're now using server-side filtering, just return the requests as-is
    return requests;
  }, [requests]);

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests..."
            className="flex-1 h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
          />
          <button 
            onClick={load} 
            disabled={loadingRequests}
            className="h-10 px-3 rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            {loadingRequests ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Completed Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status:</label>
            <select
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              className="h-8 px-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
            >
              <option value="all">All Requests</option>
              <option value="true">Completed</option>
              <option value="false">In Progress</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
            >
              <option value="requestId">Request ID</option>
              <option value="originalRequest">Title</option>
              <option value="completion">Completion %</option>
              <option value="tasks">Task Count</option>
            </select>
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-8 px-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm flex items-center gap-1"
          >
            {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </button>

          {/* Page Size */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}
              className="h-8 px-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Pagination Info */}
        {pagination && (
          <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <div>
              Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={!pagination.hasPrev || loadingRequests}
                className="h-8 px-3 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 enabled:hover:bg-neutral-50 dark:enabled:hover:bg-neutral-800"
              >
                Previous
              </button>
              <span className="px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={!pagination.hasNext || loadingRequests}
                className="h-8 px-3 rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 enabled:hover:bg-neutral-50 dark:enabled:hover:bg-neutral-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="text-sm px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            {showBulkActions ? 'Hide Selection' : 'Multi-Select'}
          </button>
          
          {showBulkActions && (
            <>
              <button
                onClick={handleSelectAll}
                className="text-sm px-3 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                {selectedRequestIds.size === requests.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedRequestIds.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedRequestIds.size} selected
                  </span>
                  <button
                    onClick={() => setConfirmBulkDelete(true)}
                    disabled={deleting}
                    className="text-sm px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Display any delete errors */}
      {deleteError && (
        <ErrorDisplay
          error={deleteError}
          title="Failed to delete request"
          onDismiss={clearDeleteError}
          variant="error"
        />
      )}

      {/* Main content with fallback UI */}
      <FallbackUI
        isLoading={loadingRequests}
        error={loadError}
        isEmpty={!loadingRequests && filtered.length === 0}
        onRetry={load}
        loadingMessage="Loading requests..."
        emptyMessage="No requests found. Create a new request to get started."
        emptyTitle="No Requests"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <RequestCard 
              key={r.requestId} 
              request={r} 
              onDeleteAction={onDeleteAction}
              onSelectToggleAction={handleSelectToggle}
              isSelected={selectedRequestIds.has(r.requestId)}
              showCheckbox={showBulkActions}
            />
          ))}
        </div>
      </FallbackUI>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete request?"
        description="This will permanently remove the request and all its tasks."
        confirmText="Delete"
        confirmLoading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title={`Delete ${selectedRequestIds.size} request${selectedRequestIds.size > 1 ? 's' : ''}?`}
        description="This will permanently remove the selected requests and all their tasks."
        confirmText="Delete All"
        confirmLoading={deleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
