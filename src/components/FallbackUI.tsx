'use client';

import { ErrorDisplay } from './ErrorDisplay';

interface FallbackUIProps {
  isLoading?: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingMessage?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FallbackUI({
  isLoading = false,
  error = null,
  isEmpty = false,
  onRetry,
  loadingMessage = 'Loading...',
  emptyMessage = 'No data available.',
  emptyTitle = 'No Results',
  className = '',
  children
}: FallbackUIProps) {
  // Error state takes priority
  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <ErrorDisplay
          error={error}
          title="Failed to load data"
          onRetry={onRetry}
          retryLabel="Retry"
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">{loadingMessage}</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="mx-auto w-24 h-24 text-gray-400 mb-4">
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyTitle}</h3>
        <p className="text-gray-600 mb-4">{emptyMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        )}
      </div>
    );
  }

  // Render children if no fallback state is needed
  return <>{children}</>;
}

// Loading spinner component
export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  text 
}: { 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  text?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <div 
          className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}
        />
        {text && (
          <span className="text-gray-600 text-sm">{text}</span>
        )}
      </div>
    </div>
  );
}

// Skeleton loader component
export function SkeletonLoader({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number; 
  className?: string;
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          {index < lines - 1 && <div className="h-4 bg-gray-300 rounded w-1/2"></div>}
        </div>
      ))}
    </div>
  );
}

// Card skeleton loader
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="space-y-4">
        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-5/6"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-6 bg-gray-300 rounded w-16"></div>
          <div className="h-6 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
