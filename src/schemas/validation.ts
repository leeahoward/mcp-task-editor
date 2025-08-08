import { z } from 'zod';

// Core validation schemas
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Task description is required'),
  done: z.boolean(),
  approved: z.boolean(),
  completedDetails: z.string()
});

export const RequestSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  originalRequest: z.string().min(1, 'Original request is required'),
  splitDetails: z.string(),
  tasks: z.array(TaskSchema),
  completed: z.boolean()
});

export const TasksDataSchema = z.object({
  requests: z.array(RequestSchema)
});

// Form validation schemas
export const TaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  done: z.boolean(),
  approved: z.boolean(),
  completedDetails: z.string()
});

export const RequestFormSchema = z.object({
  originalRequest: z.string().min(1, 'Original request is required'),
  splitDetails: z.string(),
  completed: z.boolean()
});

// API parameter schemas
export const RequestIdSchema = z.object({
  id: z.string().min(1, 'Request ID is required')
});

export const TaskIdSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  taskId: z.string().min(1, 'Task ID is required')
});

// Search and filter schemas
export const SearchFiltersSchema = z.object({
  query: z.string().optional(),
  completed: z.boolean().nullable().optional(),
  approved: z.boolean().nullable().optional(),
  hasDetails: z.boolean().nullable().optional()
});

export const SortOptionsSchema = z.object({
  field: z.enum(['title', 'completion', 'created', 'updated']),
  direction: z.enum(['asc', 'desc'])
});

// Export inferred types
export type TaskSchemaType = z.infer<typeof TaskSchema>;
export type RequestSchemaType = z.infer<typeof RequestSchema>;
export type TasksDataSchemaType = z.infer<typeof TasksDataSchema>;
export type TaskFormSchemaType = z.infer<typeof TaskFormSchema>;
export type RequestFormSchemaType = z.infer<typeof RequestFormSchema>;
