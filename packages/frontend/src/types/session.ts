/**
 * Session-related type definitions
 */

export interface UserSession {
  username: string;
  establishedAt: Date;
}

export interface SessionError {
  code: 'INVALID_USERNAME' | 'SESSION_REQUIRED' | 'ACCESS_DENIED' | 'STORAGE_ERROR';
  message: string;
  details?: {
    username?: string;
    validationRules?: string[];
  };
}