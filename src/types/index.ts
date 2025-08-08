// Core data model types for the task management system
export interface Task {
  id: string;
  title: string;
  description: string;
  done: boolean;
  approved: boolean;
  completedDetails: string;
}

export interface Request {
  requestId: string;
  originalRequest: string;
  splitDetails: string;
  tasks: Task[];
  completed: boolean;
}

export interface TasksData {
  requests: Request[];
}

// Derived types for UI components
export interface RequestSummary {
  requestId: string;
  originalRequest: string;
  totalTasks: number;
  completedTasks: number;
  approvedTasks: number;
  completionPercentage: number;
  approvalPercentage: number;
  completed: boolean;
}

export interface TaskSummary {
  id: string;
  title: string;
  done: boolean;
  approved: boolean;
  hasDetails: boolean;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public status: number;
  public validation?: ValidationError[];

  constructor(message: string, status: number, validation?: ValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.validation = validation;
  }
}

// Form data types
export interface RequestFormData {
  originalRequest: string;
  splitDetails: string;
  completed: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  done: boolean;
  approved: boolean;
  completedDetails: string;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  completed?: boolean | null;
  approved?: boolean | null;
  hasDetails?: boolean | null;
}

export interface SortOptions {
  field: 'title' | 'completion' | 'created' | 'updated';
  direction: 'asc' | 'desc';
}
