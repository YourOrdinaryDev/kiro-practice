import { DatabaseConnection, getDbConnection } from '../database/index.js';
import { Todo, CreateTodoRequest, UpdateTodoRequest } from '../types/todo.js';

interface TodoRow {
  id: number;
  text: string;
  completed: number; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at: string;
}

export class TodoService {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    this.db = db || getDbConnection();
  }

  /**
   * Retrieve all todos from the database, ordered by completion status and creation date
   */
  async getAllTodos(): Promise<Todo[]> {
    try {
      const sql = `
        SELECT id, text, completed, created_at, updated_at 
        FROM todos 
        ORDER BY completed ASC, created_at DESC
      `;
      
      const rows = await this.db.all<TodoRow>(sql);
      return rows.map(this.mapRowToTodo);
    } catch (error) {
      throw new Error(`Failed to retrieve todos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new todo item
   */
  async createTodo(data: CreateTodoRequest): Promise<Todo> {
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
        INSERT INTO todos (text, completed) 
        VALUES (?, 0)
      `;
      
      const result = await this.db.run(sql, [trimmedText]);
      
      if (!result.lastID) {
        throw new Error('Failed to create todo: No ID returned');
      }

      // Retrieve the created todo
      const createdTodo = await this.getTodoById(result.lastID);
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
   * Update a todo's completion status
   */
  async updateTodo(id: number, data: UpdateTodoRequest): Promise<Todo> {
    // Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Todo ID must be a positive integer');
    }

    if (typeof data.completed !== 'boolean') {
      throw new Error('Completed status must be a boolean value');
    }

    try {
      // Check if todo exists
      const existingTodo = await this.getTodoById(id);
      if (!existingTodo) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      const sql = `
        UPDATE todos 
        SET completed = ? 
        WHERE id = ?
      `;
      
      const result = await this.db.run(sql, [data.completed ? 1 : 0, id]);
      
      if (result.changes === 0) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      // Retrieve the updated todo
      const updatedTodo = await this.getTodoById(id);
      if (!updatedTodo) {
        throw new Error('Failed to retrieve updated todo');
      }

      return updatedTodo;
    } catch (error) {
      throw new Error(`Failed to update todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a todo by ID
   */
  async deleteTodo(id: number): Promise<void> {
    // Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Todo ID must be a positive integer');
    }

    try {
      // Check if todo exists
      const existingTodo = await this.getTodoById(id);
      if (!existingTodo) {
        throw new Error(`Todo with ID ${id} not found`);
      }

      const sql = `DELETE FROM todos WHERE id = ?`;
      const result = await this.db.run(sql, [id]);
      
      if (result.changes === 0) {
        throw new Error(`Todo with ID ${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to get a todo by ID
   */
  private async getTodoById(id: number): Promise<Todo | null> {
    try {
      const sql = `
        SELECT id, text, completed, created_at, updated_at 
        FROM todos 
        WHERE id = ?
      `;
      
      const row = await this.db.get<TodoRow>(sql, [id]);
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