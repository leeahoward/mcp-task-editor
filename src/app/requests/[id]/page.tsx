'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, TextArea, Checkbox } from '@/components/form/inputs';
import TaskCard from '@/components/cards/TaskCard';
import Spinner from '@/components/common/Spinner';
import type { Request, Task } from '@/types';

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<Request | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requestId, setRequestId] = useState<string>('');
  
  // Form state
  const [originalRequest, setOriginalRequest] = useState('');
  const [splitDetails, setSplitDetails] = useState('');
  const [completed, setCompleted] = useState(false);

  // Add Task Modal state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const load = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Request not found');
          return;
        }
        throw new Error('Failed to load request');
      }
      const json = await res.json();
      const data = json.data as Request;
      setRequest(data);
      setTasks(data.tasks || []);
      setOriginalRequest(data.originalRequest);
      setSplitDetails(data.splitDetails);
      setCompleted(data.completed);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading request');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalRequest,
          splitDetails,
          completed
        })
      });
      if (!res.ok) throw new Error('Failed to save request');
      await load(requestId); // Reload to get updated data
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addTask = async () => {
    if (!taskTitle.trim() || !taskDescription.trim()) {
      setError('Task title and description are required');
      return;
    }

    try {
      setAddingTask(true);
      setError(null);
      
      const res = await fetch(`/api/requests/${requestId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          done: false,
          approved: false,
          completedDetails: ''
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create task');
      }

      // Reset form and close modal
      setTaskTitle('');
      setTaskDescription('');
      setShowAddTaskModal(false);
      
      // Reload to get updated data
      await load(requestId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  const cancel = () => {
    if (request) {
      setOriginalRequest(request.originalRequest);
      setSplitDetails(request.splitDetails);
      setCompleted(request.completed);
    }
  };

  useEffect(() => {
    params.then(({ id }) => {
      setRequestId(id);
      load(id);
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Spinner /> Loading request...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={() => router.push('/requests')}
          className="px-3 h-9 rounded-md border border-neutral-300 dark:border-neutral-700"
        >
          Back to Requests
        </button>
      </div>
    );
  }

  if (!request) return null;

  const hasChanges = 
    originalRequest !== request.originalRequest ||
    splitDetails !== request.splitDetails ||
    completed !== request.completed;

  const completedTasks = tasks.filter(t => t.done).length;
  const approvedTasks = tasks.filter(t => t.approved).length;
  const completionPct = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const approvalPct = tasks.length > 0 ? Math.round((approvedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Request {request.requestId}</h1>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {tasks.length} tasks • {completionPct}% complete • {approvalPct}% approved
          </div>
        </div>
        <button 
          onClick={() => router.push('/requests')}
          className="px-3 h-9 rounded-md border border-neutral-300 dark:border-neutral-700"
        >
          Back to Requests
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Request Details</h2>
          
          <TextInput
            label="Original Request"
            value={originalRequest}
            onChange={(e) => setOriginalRequest(e.target.value)}
            placeholder="Enter request description..."
          />
          
          <TextArea
            label="Split Details"
            value={splitDetails}
            onChange={(e) => setSplitDetails(e.target.value)}
            placeholder="Enter implementation details..."
            rows={6}
          />
          
          <Checkbox
            label="Mark as completed"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
          />

          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 h-9 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={cancel}
                disabled={saving}
                className="px-4 h-9 rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks ({tasks.length})</h2>
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="px-3 h-8 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm"
            >
              Add Task
            </button>
          </div>
          
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              No tasks yet. Click &quot;Add Task&quot; to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  requestId={request.requestId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold">Add New Task</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                Create a new task for this request
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
              
              <TextInput
                label="Task Title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Enter task title..."
                disabled={addingTask}
              />
              
              <TextArea
                label="Task Description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter detailed task description..."
                rows={4}
                disabled={addingTask}
              />
            </div>
            
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setTaskTitle('');
                  setTaskDescription('');
                  setError(null);
                }}
                disabled={addingTask}
                className="px-4 h-9 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={addingTask || !taskTitle.trim() || !taskDescription.trim()}
                className="px-4 h-9 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {addingTask && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {addingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
