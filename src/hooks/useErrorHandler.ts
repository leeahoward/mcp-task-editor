'use client';

import { useState, useCallback } from 'react';

export interface ErrorState {
  error: Error | string | null;
  isError: boolean;
  clearError: () => void;
  setError: (error: Error | string) => void;
}

export function useErrorHandler(): ErrorState {
  const [error, setErrorState] = useState<Error | string | null>(null);

  const setError = useCallback((error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    // Log error for debugging
    console.error('Error caught by useErrorHandler:', error);
    
    // In production, you might want to send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // reportError(error);
    }
    
    setErrorState(error);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  return {
    error,
    isError: error !== null,
    clearError,
    setError
  };
}

// Hook for handling async operations with error handling
export function useAsyncOperation<T = any>() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const { error, isError, clearError, setError } = useErrorHandler();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      clearPreviousError?: boolean;
    }
  ) => {
    const { onSuccess, onError, clearPreviousError = true } = options || {};
    
    if (clearPreviousError) {
      clearError();
    }
    
    setIsLoading(true);
    
    try {
      const result = await operation();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, setError]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    clearError();
  }, [clearError]);

  return {
    isLoading,
    data,
    error,
    isError,
    execute,
    reset,
    clearError
  };
}

// Global error logger utility
export class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: Array<{ error: Error | string; timestamp: Date; context?: string }> = [];

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error | string, context?: string) {
    const errorEntry = {
      error,
      timestamp: new Date(),
      context
    };
    
    this.errors.push(errorEntry);
    
    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorLogger${context ? ` - ${context}` : ''}]:`, error);
    }
    
    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.reportToService(errorEntry);
    }
  }

  private reportToService(errorEntry: { error: Error | string; timestamp: Date; context?: string }) {
    // Example implementation for error reporting service
    // This could be Sentry, LogRocket, Bugsnag, etc.
    try {
      // Example: fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorEntry) });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  getErrors(): Array<{ error: Error | string; timestamp: Date; context?: string }> {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

// Global error handler for unhandled promise rejections and errors
export function setupGlobalErrorHandling() {
  const logger = ErrorLogger.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.log(new Error(event.reason), 'Unhandled Promise Rejection');
    event.preventDefault(); // Prevent default browser error logging
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.log(event.error || new Error(event.message), 'Uncaught Error');
  });
}

// Helper function to wrap API calls with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  const logger = ErrorLogger.getInstance();
  
  try {
    return await operation();
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.log(errorObj, context);
    throw errorObj;
  }
}
