import { vi } from 'vitest';

// Mock Next.js modules
vi.mock('next/server', () => ({
  NextRequest: class {
    constructor(public url: string) {}
    nextUrl = new URL(this.url);
  }
}));

// Setup global mocks if needed
global.fetch = vi.fn();
