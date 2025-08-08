'use client';

import { useState, useEffect } from 'react';

export interface ErrorDisplayProps {
  error?: Error | string | null;
  title?: string;
  message?: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryLabel?: string;
  dismissible?: boolean;
  className?: string;
}

export function ErrorDisplay({
  error,
  title,
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  retryLabel = 'Try Again',
  dismissible = true,
  className = ''
}: ErrorDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide info/warning messages after 5 seconds
  useEffect(() => {
    if (variant !== 'error' && dismissible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [variant, dismissible, onDismiss]);

  if (!isVisible || (!error && !message)) {
    return null;
  }

  const errorMessage = error ? (typeof error === 'string' ? error : error.message) : message;
  
  const variantStyles = {
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-500',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-500',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  };

  const styles = variantStyles[variant];

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${title ? 'mt-1' : ''} ${styles.message}`}>
            {errorMessage}
          </div>
          
          {(onRetry || (dismissible && variant === 'error')) && (
            <div className="mt-3 flex space-x-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`text-white text-xs py-1.5 px-3 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
                >
                  {retryLabel}
                </button>
              )}
              {dismissible && variant === 'error' && (
                <button
                  onClick={handleDismiss}
                  className="text-gray-600 bg-gray-200 text-xs py-1.5 px-3 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {dismissible && variant !== 'error' && (
          <div className="ml-auto pl-3">
            <button
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${styles.icon}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Utility function to extract user-friendly error messages
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  if (typeof error === 'string') return error;
  
  if (error instanceof Error) {
    // Handle API errors with specific format
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    
    if (error.message.includes('409')) {
      return 'Data conflict. The resource may have been modified by another user.';
    }
    
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    
    return 'An error occurred while processing your request.';
  }
  
  return 'An unknown error occurred';
}
