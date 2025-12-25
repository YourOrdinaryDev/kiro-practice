import type { Todo, CreateTodoRequest, UpdateTodoRequest, ApiResponse, ApiError } from '../types/todo.js';

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
   * Retrieve all todos from the backend
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
      return result.data.map(todo => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
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
        createdAt: new Date(result.data.createdAt),
        updatedAt: new Date(result.data.updatedAt),
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
        createdAt: new Date(result.data.createdAt),
        updatedAt: new Date(result.data.updatedAt),
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
        throw new AuthenticationError(`Authentication required: ${errorMessage}`);
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