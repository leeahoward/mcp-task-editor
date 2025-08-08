import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse, ApiError, ValidationError } from '@/types';

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  message: string, 
  status: number = 500, 
  validation?: ValidationError[]
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error: message,
    validation
  }, { status });
}

/**
 * Handle different types of errors and convert them to API responses
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return createErrorResponse(error.message, error.status, error.validation);
  }

  if (error instanceof ZodError) {
    const validation: ValidationError[] = error.issues.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    return createErrorResponse('Validation failed', 400, validation);
  }

  if (error instanceof Error) {
    return createErrorResponse(error.message, 500);
  }

  return createErrorResponse('Internal server error', 500);
}

/**
 * Extract request body and validate it
 */
export async function extractRequestBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ApiError('Invalid JSON in request body', 400);
  }
}

/**
 * Extract URL parameters
 */
export function extractParams(params: { [key: string]: string | string[] | undefined }): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value[0] || '';
    } else {
      result[key] = '';
    }
  }
  
  return result;
}

/**
 * Extract search parameters from URL
 */
export function extractSearchParams(searchParams: URLSearchParams): { [key: string]: string | boolean | null } {
  const result: { [key: string]: string | boolean | null } = {};
  
  for (const [key, value] of searchParams.entries()) {
    // Handle boolean values
    if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (value === 'null') {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string, existingIds: string[]): string {
  let counter = 1;
  let newId = `${prefix}-${counter}`;
  
  while (existingIds.includes(newId)) {
    counter++;
    newId = `${prefix}-${counter}`;
  }
  
  return newId;
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(obj: any, fields: string[]): void {
  const missing = fields.filter(field => !obj[field] || obj[field] === '');
  
  if (missing.length > 0) {
    const validation: ValidationError[] = missing.map(field => ({
      field,
      message: `${field} is required`
    }));
    
    throw new ApiError('Missing required fields', 400, validation);
  }
}
