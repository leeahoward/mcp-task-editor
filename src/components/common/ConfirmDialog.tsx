"use client";
import React from 'react';

interface ConfirmDialogProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  open: boolean;
  confirmLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = "Confirm Action",
  description = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmLoading = false,
  open,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{description}</p>
        </div>
        <div className="p-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 h-9 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmLoading}
            className="px-3 h-9 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm flex items-center gap-2"
          >
            {confirmLoading && (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
