import type {
  Todo,
  TodoList,
  User,
  CreateTodoRequest,
  UpdateTodoRequest,
  CreateTodoListRequest,
  UpdateTodoListRequest,
  MoveTodoRequest,
  ApiResponse,
  ApiError,
} from '../types/todo.js';

/**
 * Safely convert a date string or Date object to a Date instance
 * @param dateValue The date value to convert (string, Date, or potentially undefined)
 * @returns A valid Date object, or current date if conversion fails
 */
function safelyConvertDate(dateValue: any): Date {
  if (!dateValue) {
    return new Date();
  }

  if (dateValue instanceof Date) {
    return dateValue;
  }

  try {
    const converted = new Date(dateValue);
    // Check if the date is valid
    if (isNaN(converted.getTime())) {
      console.warn('Invalid date value received:', dateValue);
      return new Date();
    }
    return converted;
  } catch (error) {
    console.warn('Error converting date:', dateValue, error);
    return new Date();
  }
}

/**
 * HTTP client for Todo API operations
 * Handles all communication with the backend REST API
 */
export class TodoApiClient {
  private readonly baseUrl: string;
  private username: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the username for API authentication
   * @param username The username to use for API requests
   */
  setUsername(username: string): void {
    this.username = username;
  }

  /**
   * Clear the username context
   */
  clearUsername(): void {
    this.username = null;
  }

  /**
   * Get the current username
   * @returns The current username or null if not set
   */
  getCurrentUsername(): string | null {
    return this.username;
  }

  /**
   * Create headers for API requests including authentication
   * @returns Headers object with Content-Type and X-Username if available
   */
  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.username) {
      headers['X-Username'] = this.username;
    }

    return headers;
  }

  /**
   * Get or create a user by username
   * @param username The username to get or create
   * @returns Promise<User> The user object
   * @throws Error if the request fails
   */
  async getOrCreateUser(username: string): Promise<User> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/users/${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers: this.createHeaders(),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<User> = await response.json();

      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get or create user: Unknown error occurred');
    }
  }

  /**
   * Get all todo lists for a user
   * @param userId The user ID to get lists for
   * @returns Promise<TodoList[]> Array of todo lists
   * @throws Error if the request fails
   */
  async getListsForUser(userId: number): Promise<TodoList[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/users/${userId}/lists`,
        {
          method: 'GET',
          headers: this.createHeaders(),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<TodoList[]> = await response.json();

      return result.data.map((list) => ({
        ...list,
        created_at: safelyConvertDate(list.created_at),
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch lists: Unknown error occurred');
    }
  }

  /**
   * Create a new todo list
   * @param userId The user ID to create the list for
   * @param name The name of the new list
   * @returns Promise<TodoList> The created list
   * @throws Error if the request fails
   */
  async createList(userId: number, name: string): Promise<TodoList> {
    try {
      const requestBody: CreateTodoListRequest = { name, user_id: userId };

      const response = await fetch(
        `${this.baseUrl}/api/users/${userId}/lists`,
        {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<TodoList> = await response.json();

      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create list: Unknown error occurred');
    }
  }

  /**
   * Update a todo list name
   * @param listId The list ID to update
   * @param name The new name for the list
   * @returns Promise<TodoList> The updated list
   * @throws Error if the request fails
   */
  async updateList(listId: number, name: string): Promise<TodoList> {
    try {
      const requestBody: UpdateTodoListRequest = { name };

      const response = await fetch(`${this.baseUrl}/api/lists/${listId}`, {
        method: 'PUT',
        headers: this.createHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<TodoList> = await response.json();

      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update list: Unknown error occurred');
    }
  }

  /**
   * Delete a todo list
   * @param listId The list ID to delete
   * @returns Promise<void> Resolves when deletion is successful
   * @throws Error if the request fails
   */
  async deleteList(listId: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/lists/${listId}`, {
        method: 'DELETE',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete list: Unknown error occurred');
    }
  }

  /**
   * Get todos for a specific list
   * @param listId The list ID to get todos for
   * @returns Promise<Todo[]> Array of todos in the list
   * @throws Error if the request fails
   */
  async getTodosInList(listId: number): Promise<Todo[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/lists/${listId}/todos`,
        {
          method: 'GET',
          headers: this.createHeaders(),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo[]> = await response.json();

      return result.data.map((todo) => ({
        ...todo,
        created_at: safelyConvertDate(todo.created_at),
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch todos: Unknown error occurred');
    }
  }

  /**
   * Create a new todo in a specific list
   * @param listId The list ID to create the todo in
   * @param text The todo description text
   * @returns Promise<Todo> The created todo
   * @throws Error if the request fails
   */
  async createTodoInList(listId: number, text: string): Promise<Todo> {
    try {
      const requestBody: CreateTodoRequest = { text, list_id: listId };

      const response = await fetch(
        `${this.baseUrl}/api/lists/${listId}/todos`,
        {
          method: 'POST',
          headers: this.createHeaders(),
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo> = await response.json();

      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create todo: Unknown error occurred');
    }
  }

  /**
   * Move a todo to a different list
   * @param todoId The todo ID to move
   * @param targetListId The target list ID
   * @returns Promise<Todo> The updated todo
   * @throws Error if the request fails
   */
  async moveTodoToList(todoId: number, targetListId: number): Promise<Todo> {
    try {
      const requestBody: MoveTodoRequest = { target_list_id: targetListId };

      const response = await fetch(`${this.baseUrl}/api/todos/${todoId}/move`, {
        method: 'PUT',
        headers: this.createHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo> = await response.json();

      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to move todo: Unknown error occurred');
    }
  }
  /**
   * Retrieve all todos from the backend (legacy method for backward compatibility)
   * @returns Promise<Todo[]> Array of all todos
   * @throws Error if the request fails or returns an error response
   */
  async getTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/todos`, {
        method: 'GET',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo[]> = await response.json();

      // Convert date strings back to Date objects
      return result.data.map((todo) => ({
        ...todo,
        created_at: safelyConvertDate(todo.created_at),
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch todos: Unknown error occurred');
    }
  }

  /**
   * Create a new todo item
   * @param text The todo description text
   * @returns Promise<Todo> The created todo with generated ID and timestamps
   * @throws Error if the request fails, validation fails, or returns an error response
   */
  async createTodo(text: string): Promise<Todo> {
    try {
      const requestBody: CreateTodoRequest = { text };

      const response = await fetch(`${this.baseUrl}/api/todos`, {
        method: 'POST',
        headers: this.createHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo> = await response.json();

      // Convert date strings back to Date objects
      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create todo: Unknown error occurred');
    }
  }

  /**
   * Update a todo's completion status
   * @param id The todo ID to update
   * @param completed The new completion status
   * @returns Promise<Todo> The updated todo
   * @throws Error if the request fails, todo not found, or returns an error response
   */
  async updateTodo(id: number, completed: boolean): Promise<Todo> {
    try {
      const requestBody: UpdateTodoRequest = { completed };

      const response = await fetch(`${this.baseUrl}/api/todos/${id}`, {
        method: 'PUT',
        headers: this.createHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const result: ApiResponse<Todo> = await response.json();

      // Convert date strings back to Date objects
      return {
        ...result.data,
        created_at: safelyConvertDate(result.data.created_at),
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update todo: Unknown error occurred');
    }
  }

  /**
   * Delete a todo permanently
   * @param id The todo ID to delete
   * @returns Promise<void> Resolves when deletion is successful
   * @throws Error if the request fails, todo not found, or returns an error response
   */
  async deleteTodo(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/todos/${id}`, {
        method: 'DELETE',
        headers: this.createHeaders(),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // DELETE endpoint returns 204 No Content on success
      // No need to parse response body
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete todo: Unknown error occurred');
    }
  }

  /**
   * Handle error responses from the API
   * @param response The failed HTTP response
   * @throws Error with descriptive message based on the error response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      // Try to parse error response as JSON
      const errorResult: ApiError = await response.json();
      if (errorResult.error && errorResult.error.message) {
        errorMessage = errorResult.error.message;
      }
    } catch {
      // If JSON parsing fails, use the default HTTP error message
      // This handles cases where the server returns non-JSON error responses
    }

    // Handle specific HTTP status codes with appropriate error messages
    switch (response.status) {
      case 400:
        throw new Error(`Invalid request: ${errorMessage}`);
      case 401:
        // Authentication required - session may have expired or username missing
        throw new AuthenticationError(
          `Authentication required: ${errorMessage}`
        );
      case 403:
        // Access denied - user doesn't have permission for this resource
        throw new AuthenticationError(`Access denied: ${errorMessage}`);
      case 404:
        throw new Error(`Resource not found: ${errorMessage}`);
      case 500:
        throw new Error(`Server error: ${errorMessage}`);
      default:
        throw new Error(`Request failed: ${errorMessage}`);
    }
  }
}

/**
 * Custom error class for authentication-related errors
 * Used to distinguish authentication failures from other API errors
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Export a default instance for convenience
export const todoApiClient = new TodoApiClient();
