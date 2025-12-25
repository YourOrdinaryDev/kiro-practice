export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoRequest {
  text: string;
}

export interface UpdateTodoRequest {
  completed: boolean;
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