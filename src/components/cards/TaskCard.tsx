'use client';
import Link from 'next/link';
import type { Task } from '@/types';

export default function TaskCard({ task, requestId, href }: { task: Task; requestId: string; href?: string }) {
  const url = href ?? `/requests/${requestId}/tasks/${task.id}`;
  return (
    <Link href={url} className="block rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">
          {task.title}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {task.done ? (
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white">Done</span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700">Pending</span>
          )}
          {task.approved ? (
            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white">Approved</span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700">Unapproved</span>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 line-clamp-2">{task.description}</p>
      )}
    </Link>
  );
}
