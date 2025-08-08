"use client";
import React from 'react';

type BaseProps = {
  id?: string;
  label?: string;
  helpText?: string;
  error?: string;
  className?: string;
};

export function TextInput({ id, label, helpText, error, className = '', ...props }: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block text-sm ${className}`} htmlFor={id}>
      {label && <div className="mb-1 text-neutral-700 dark:text-neutral-300">{label}</div>}
      <input
        id={id}
        className={`w-full h-9 px-3 rounded-md border ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-700 focus:ring-neutral-500'} bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2`}
        {...props}
      />
      {helpText && <div className="mt-1 text-xs text-neutral-500">{helpText}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}

export function TextArea({ id, label, helpText, error, className = '', rows = 4, ...props }: BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block text-sm ${className}`} htmlFor={id}>
      {label && <div className="mb-1 text-neutral-700 dark:text-neutral-300">{label}</div>}
      <textarea
        id={id}
        rows={rows}
        className={`w-full px-3 py-2 rounded-md border ${error ? 'border-red-500 focus:ring-red-500' : 'border-neutral-300 dark:border-neutral-700 focus:ring-neutral-500'} bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2`}
        {...props}
      />
      {helpText && <div className="mt-1 text-xs text-neutral-500">{helpText}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}

export function Checkbox({ id, label, className = '', ...props }: { id?: string; label?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`} htmlFor={id}>
      <input id={id} type="checkbox" className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700" {...props} />
      {label}
    </label>
  );
}
