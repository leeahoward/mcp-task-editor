'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, TextArea, Checkbox } from '@/components/form/inputs';
import Spinner from '@/components/common/Spinner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { Task } from '@/types';

export default function TaskEditPage({ 
  params 
}: { 
  params: Promise<{ id: string; taskId: string }> 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [requestId, setRequestId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState(false);
  const [approved, setApproved] = useState(false);
  const [completedDetails, setCompletedDetails] = useState('');

  const load = async (requestId: string, taskId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/requests/${requestId}/tasks/${taskId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Task not found');
          return;
        }
        throw new Error('Failed to load task');
      }
      const json = await res.json();
      const data = json.data as Task;
      setTask(data);
      setTitle(data.title);
      setDescription(data.description);
      setDone(data.done);
      setApproved(data.approved);
      setCompletedDetails(data.completedDetails);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Error loading task');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/requests/${requestId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          done,
          approved,
          completedDetails
        })
      });
      if (!res.ok) throw new Error('Failed to save task');
      await load(requestId, taskId); // Reload to get updated data
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/requests/${requestId}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete task');
      router.push(`/requests/${requestId}`);
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const cancel = () => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDone(task.done);
      setApproved(task.approved);
      setCompletedDetails(task.completedDetails);
    }
  };

  const hasChanges = task && (
    title !== task.title ||
    description !== task.description ||
    done !== task.done ||
    approved !== task.approved ||
    completedDetails !== task.completedDetails
  );

  useEffect(() => {
    params.then(({ id, taskId }) => {
      setRequestId(id);
      setTaskId(taskId);
      load(id, taskId);
    });
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Spinner /> Loading task...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-600">{error}</div>
        <button 
          onClick={() => router.push(`/requests/${requestId}`)}
          className="px-3 h-9 rounded-md border border-neutral-300 dark:border-neutral-700"
        >
          Back to Request
        </button>
      </div>
    );
  }

  if (!task) {
    return <div>Task not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task {taskId}</h1>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Request {requestId}
          </div>
        </div>
        <button 
          onClick={() => router.push(`/requests/${requestId}`)}
          className="px-3 h-9 rounded-md border border-neutral-300 dark:border-neutral-700"
        >
          Back to Request
        </button>
      </div>

      {/* Task Details Form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Task Details</h2>
          
          <div className="space-y-4">
            <TextInput
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            
            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
            
            <div className="flex gap-4">
              <Checkbox
                label="Mark as done"
                checked={done}
                onChange={(e) => setDone(e.target.checked)}
              />
              
              <Checkbox
                label="Mark as approved"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
            </div>
            
            <TextArea
              label="Completed Details"
              value={completedDetails}
              onChange={(e) => setCompletedDetails(e.target.value)}
              rows={6}
              placeholder="Add details about task completion..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || !hasChanges}
            className="px-4 h-10 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            onClick={cancel}
            disabled={saving || !hasChanges}
            className="px-4 h-10 border border-neutral-300 dark:border-neutral-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={saving}
            className="px-4 h-10 bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Task
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        description="This will permanently remove the task. This action cannot be undone."
        confirmText="Delete"
        onConfirm={deleteTask}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
