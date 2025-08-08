'use client';

import { useEffect } from 'react';
import { setupGlobalErrorHandling } from '@/hooks/useErrorHandler';

export function ClientErrorSetup() {
  useEffect(() => {
    // Set up global error handling on the client side
    setupGlobalErrorHandling();
  }, []);

  return null; // This component doesn't render anything
}
