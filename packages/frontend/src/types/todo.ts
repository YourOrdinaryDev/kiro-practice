// Frontend types for Todo API
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  list_id: number;
  created_at: Date;
}

export interface User {
  id: number;
  username: string;
  created_at: Date;
}

export interface TodoList {
  id: number;
  name: string;
  user_id: number;
  created_at: Date;
  todo_count?: number; // Computed field for UI
}

export interface TodoWithList extends Todo {
  list_name: string; // For cross-list operations
}

// Legacy interface for backward compatibility during migration
export interface LegacyTodo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateTodoRequest {
  text: string;
  list_id?: number;
}

export interface UpdateTodoRequest {
  completed?: boolean;
  text?: string;
}

export interface MoveTodoRequest {
  target_list_id: number;
}

export interface CreateUserRequest {
  username: string;
}

export interface CreateTodoListRequest {
  name: string;
  user_id: number;
}

export interface UpdateTodoListRequest {
  name: string;
}

export interface ApiResponse<T> {
  data: T;
  success: true;
}

export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: any;
  };
  success: false;
}
