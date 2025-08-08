'use client';
import Link from 'next/link';
import type { RequestSummary } from '@/types';

type Props = {
  request: RequestSummary;
  onDeleteAction?: (id: string) => void;
  onSelectToggleAction?: (id: string, selected: boolean) => void;
  isSelected?: boolean;
  showCheckbox?: boolean;
};

export default function RequestCard({ 
  request, 
  onDeleteAction, 
  onSelectToggleAction, 
  isSelected = false, 
  showCheckbox = false 
}: Props) {
  const completionPct = request.completionPercentage;
  const approvalPct = request.approvalPercentage;

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelectToggleAction?.(request.requestId, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
          )}
          <div>
            <Link href={`/requests/${request.requestId}`} className="font-semibold hover:underline">
              {request.originalRequest}
            </Link>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">ID: {request.requestId}</div>
          </div>
        </div>
        {onDeleteAction && (
          <button
            onClick={() => onDeleteAction(request.requestId)}
            className="px-2 h-8 rounded-md border border-red-300 text-red-700 hover:bg-red-50 text-xs"
          >
            Delete
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${completionPct}%` }} />
          </div>
          <span className="text-xs">{completionPct}% done</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full bg-emerald-600" style={{ width: `${approvalPct}%` }} />
          </div>
          <span className="text-xs">{approvalPct}% approved</span>
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          {request.completedTasks}/{request.totalTasks} tasks
        </div>
      </div>
    </div>
  );
}
