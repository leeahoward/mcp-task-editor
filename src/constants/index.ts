// Application constants and configuration

// API endpoints
export const API_ENDPOINTS = {
  REQUESTS: '/api/requests',
  TASKS: '/api/tasks'
} as const;

// Default values
export const DEFAULT_VALUES = {
  PAGE_SIZE: 20,
  MAX_SEARCH_RESULTS: 100,
  DEBOUNCE_DELAY: 300,
  BACKUP_RETENTION_DAYS: 30
} as const;

// Form validation
export const VALIDATION_RULES = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MIN_TITLE_LENGTH: 1,
  MIN_DESCRIPTION_LENGTH: 1
} as const;

// UI configuration
export const UI_CONFIG = {
  TRUNCATE_LENGTH: 100,
  CARD_MAX_HEIGHT: 300,
  SIDEBAR_WIDTH: 250
} as const;

// Status colors
export const STATUS_COLORS = {
  SUCCESS: 'green',
  WARNING: 'yellow',
  ERROR: 'red',
  INFO: 'blue',
  NEUTRAL: 'gray'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  SEARCH_FILTERS: 'taskEditor_searchFilters',
  SORT_PREFERENCES: 'taskEditor_sortPreferences',
  UI_PREFERENCES: 'taskEditor_uiPreferences'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested item was not found.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  FILE_LOCKED: 'The file is currently being modified. Please try again.',
  INVALID_JSON: 'Invalid data format. Please check the file.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  REQUEST_CREATED: 'Request created successfully.',
  REQUEST_UPDATED: 'Request updated successfully.',
  REQUEST_DELETED: 'Request deleted successfully.',
  TASK_CREATED: 'Task created successfully.',
  TASK_UPDATED: 'Task updated successfully.',
  TASK_DELETED: 'Task deleted successfully.',
  DATA_SAVED: 'Data saved successfully.',
  BACKUP_CREATED: 'Backup created successfully.'
} as const;
