import { DatabaseConnection, getDbConnection } from '../database/index.js';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.js';

interface TodoRow {
  id: number;
  text: string;
  completed: number; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at: string;
  username: string;
}

export class TodoService {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    this.db = db || getDbConnection();
  }

  /**
   * Retrieve all todos from the database for a specific user, ordered by completion status and creation date
   */
  async getAllTodos(username: string): Promise<Todo[]> {
    try {
      const sql = `
        SELECT id, text, completed, created_at, updated_at, username
        FROM todos 
        WHERE username = ?
        ORDER BY completed ASC, created_at DESC
      `;
      
      const rows = await this.db.all<TodoRow>(sql, [username]);
      return rows.map(this.mapRowToTodo);
    } catch (error) {
      throw new Error(`Failed to retrieve todos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new todo item for a specific user
   */
  async createTodo(username: string, data: CreateTodoRequest): Promise<Todo> {
    // Input validation
    if (typeof data.text !== 'string') {
      throw new Error('Todo text is required and must be a string');
    }

    const trimmedText = data.text.trim();
    if (trimmedText.length === 0) {
      throw new Error('Todo text cannot be empty or contain only whitespace');
    }

    if (trimmedText.length > 500) {
      throw new Error('Todo text cannot exceed 500 characters');
    }

    try {
      const sql = `
        INSERT INTO todos (text, completed, username) 
        VALUES (?, 0, ?)
      `;
      
      const result = await this.db.run(sql, [trimmedText, username]);
      
      if (!result.lastID) {
        throw new Error('Failed to create todo: No ID returned');
      }

      // Retrieve the created todo
      const createdTodo = await this.getTodoById(result.lastID, username);
      if (!createdTodo) {
        throw new Error('Failed to retrieve created todo');
      }

      return createdTodo;
    } catch (error) {
      if (error instanceof Error && error.message.includes('CHECK constraint failed')) {
        throw new Error('Todo text cannot be empty or contain only whitespace');
      }
      throw new Error(`Failed to create todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a todo's completion status (only if owned by the user)
   */
  async updateTodo(username: string, id: number, data: UpdateTodoRequest): Promise<Todo> {
    // Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Todo ID must be a positive integer');
    }

    if (typeof data.completed !== 'boolean') {
      throw new Error('Completed status must be a boolean value');
    }

    try {
      // Check if todo exists and belongs to the user
      const existingTodo = await this.getTodoById(id, username);
      if (!existingTodo) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      const sql = `
        UPDATE todos 
        SET completed = ? 
        WHERE id = ? AND username = ?
      `;
      
      const result = await this.db.run(sql, [data.completed ? 1 : 0, id, username]);
      
      if (result.changes === 0) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      // Retrieve the updated todo
      const updatedTodo = await this.getTodoById(id, username);
      if (!updatedTodo) {
        throw new Error('Failed to retrieve updated todo');
      }

      return updatedTodo;
    } catch (error) {
      throw new Error(`Failed to update todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a todo by ID (only if owned by the user)
   */
  async deleteTodo(username: string, id: number): Promise<void> {
    // Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Todo ID must be a positive integer');
    }

    try {
      // Check if todo exists and belongs to the user
      const existingTodo = await this.getTodoById(id, username);
      if (!existingTodo) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      const sql = `DELETE FROM todos WHERE id = ? AND username = ?`;
      const result = await this.db.run(sql, [id, username]);
      
      if (result.changes === 0) {
        throw new Error(`Todo with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to get a todo by ID for a specific user
   */
  private async getTodoById(id: number, username: string): Promise<Todo | null> {
    try {
      const sql = `
        SELECT id, text, completed, created_at, updated_at, username
        FROM todos 
        WHERE id = ? AND username = ?
      `;
      
      const row = await this.db.get<TodoRow>(sql, [id, username]);
      return row ? this.mapRowToTodo(row) : null;
    } catch (error) {
      throw new Error(`Failed to retrieve todo by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert database row to Todo object
   */
  private mapRowToTodo(row: TodoRow): Todo {
    return {
      id: row.id,
      text: row.text,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}