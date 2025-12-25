import { DatabaseConnection, getDbConnection } from '../database/index.js';
import { Todo, CreateTodoRequest, UpdateTodoRequest, LegacyTodo } from '../types/todo.js';

interface TodoRow {
  id: number;
  text: string;
  completed: number; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at?: string; // Optional for new schema
  username?: string; // Optional for new schema
  list_id?: number; // Optional for old schema
}

export class TodoService {
  private db: DatabaseConnection;
  private isNewSchema: boolean | null = null;

  constructor(db?: DatabaseConnection) {
    this.db = db || getDbConnection();
  }

  /**
   * Check if we're using the new multi-list schema
   */
  private async checkSchemaVersion(): Promise<boolean> {
    if (this.isNewSchema !== null) {
      return this.isNewSchema;
    }

    try {
      // Check if the migration has been completed
      const migration = await this.db.get(
        'SELECT name FROM migrations WHERE name = ?',
        ['migrate_to_multi_list_schema']
      );
      
      this.isNewSchema = !!migration;
      return this.isNewSchema;
    } catch (error) {
      // If migrations table doesn't exist, we're on old schema
      this.isNewSchema = false;
      return false;
    }
  }

  /**
   * Get default list ID for a user (for new schema)
   */
  private async getDefaultListId(username: string): Promise<number> {
    // First, get or create user
    let user = await this.db.get(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      const result = await this.db.run(
        'INSERT INTO users (username) VALUES (?)',
        [username]
      );
      user = { id: result.lastID };
    }

    // Get or create default list
    let list = await this.db.get(
      'SELECT id FROM todo_lists WHERE user_id = ? AND name = ?',
      [user.id, 'My Tasks']
    );

    if (!list) {
      const result = await this.db.run(
        'INSERT INTO todo_lists (name, user_id) VALUES (?, ?)',
        ['My Tasks', user.id]
      );
      list = { id: result.lastID };
    }

    return list.id;
  }

  /**
   * Retrieve all todos from the database for a specific user, ordered by completion status and creation date
   */
  async getAllTodos(username: string): Promise<LegacyTodo[]> {
    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (isNewSchema) {
        // New schema: get todos through list association
        const listId = await this.getDefaultListId(username);
        const sql = `
          SELECT id, text, completed, created_at, list_id
          FROM todos 
          WHERE list_id = ?
          ORDER BY completed ASC, created_at DESC
        `;
        
        const rows = await this.db.all<TodoRow>(sql, [listId]);
        return rows.map(row => this.mapToLegacyTodo(this.mapRowToTodoNewSchema(row)));
      } else {
        // Old schema: use username column
        const sql = `
          SELECT id, text, completed, created_at, updated_at, username
          FROM todos 
          WHERE username = ?
          ORDER BY completed ASC, created_at DESC
        `;
        
        const rows = await this.db.all<TodoRow>(sql, [username]);
        return rows.map(this.mapRowToTodoOldSchemaLegacy);
      }
    } catch (error) {
      throw new Error(`Failed to retrieve todos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve todos from a specific list, ordered by completion status and creation date
   */
  async getTodosInList(listId: number): Promise<Todo[]> {
    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (!isNewSchema) {
        throw new Error('List-based operations require the new schema. Please run database migration first.');
      }

      const sql = `
        SELECT id, text, completed, created_at, list_id
        FROM todos 
        WHERE list_id = ?
        ORDER BY completed ASC, created_at DESC
      `;
      
      const rows = await this.db.all<TodoRow>(sql, [listId]);
      return rows.map(row => this.mapRowToTodoNewSchema(row));
    } catch (error) {
      throw new Error(`Failed to retrieve todos for list ${listId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new todo item for a specific user
   */
  async createTodo(username: string, data: CreateTodoRequest): Promise<LegacyTodo> {
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
      const isNewSchema = await this.checkSchemaVersion();
      
      if (isNewSchema) {
        // New schema: use provided list_id or get default list for user
        const listId = data.list_id || await this.getDefaultListId(username);
        
        // Verify the list exists and belongs to the user if list_id was provided
        if (data.list_id) {
          const user = await this.db.get('SELECT id FROM users WHERE username = ?', [username]);
          if (!user) {
            throw new Error('User not found');
          }

          const list = await this.db.get(
            'SELECT id FROM todo_lists WHERE id = ? AND user_id = ?',
            [data.list_id, user.id]
          );
          if (!list) {
            throw new Error('List not found or does not belong to user');
          }
        }

        const sql = `
          INSERT INTO todos (text, completed, list_id) 
          VALUES (?, 0, ?)
        `;
        
        const result = await this.db.run(sql, [trimmedText, listId]);
        
        if (!result.lastID) {
          throw new Error('Failed to create todo: No ID returned');
        }

        // Retrieve the created todo
        const createdTodo = await this.getTodoById(result.lastID, username);
        if (!createdTodo) {
          throw new Error('Failed to retrieve created todo');
        }

        return createdTodo;
      } else {
        // Old schema: create todo with username (backward compatibility)
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
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('CHECK constraint failed')) {
        throw new Error('Todo text cannot be empty or contain only whitespace');
      }
      throw new Error(`Failed to create todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new todo item in a specific list (new schema only)
   */
  async createTodoInList(listId: number, text: string): Promise<Todo> {
    // Input validation
    if (typeof text !== 'string') {
      throw new Error('Todo text is required and must be a string');
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      throw new Error('Todo text cannot be empty or contain only whitespace');
    }

    if (trimmedText.length > 500) {
      throw new Error('Todo text cannot exceed 500 characters');
    }

    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (!isNewSchema) {
        throw new Error('List-based operations require the new schema. Please run database migration first.');
      }

      // Verify the list exists
      const list = await this.db.get('SELECT id FROM todo_lists WHERE id = ?', [listId]);
      if (!list) {
        throw new Error('List not found');
      }

      const sql = `
        INSERT INTO todos (text, completed, list_id) 
        VALUES (?, 0, ?)
      `;
      
      const result = await this.db.run(sql, [trimmedText, listId]);
      
      if (!result.lastID) {
        throw new Error('Failed to create todo: No ID returned');
      }

      // Retrieve the created todo
      const createdTodo = await this.getTodoByIdInList(result.lastID, listId);
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
  async updateTodo(username: string, id: number, data: UpdateTodoRequest): Promise<LegacyTodo> {
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

      const isNewSchema = await this.checkSchemaVersion();
      
      if (isNewSchema) {
        // New schema: update by verifying user ownership through list
        const user = await this.db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
          throw new Error('User not found');
        }

        const sql = `
          UPDATE todos 
          SET completed = ? 
          WHERE id = ? AND list_id IN (
            SELECT id FROM todo_lists WHERE user_id = ?
          )
        `;
        
        const result = await this.db.run(sql, [data.completed ? 1 : 0, id, user.id]);
        
        if (result.changes === 0) {
          throw new Error(`Todo with ID ${id} not found`);
        }
      } else {
        // Old schema: update by username
        const sql = `
          UPDATE todos 
          SET completed = ? 
          WHERE id = ? AND username = ?
        `;
        
        const result = await this.db.run(sql, [data.completed ? 1 : 0, id, username]);
        
        if (result.changes === 0) {
          throw new Error(`Todo with ID ${id} not found`);
        }
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

      const isNewSchema = await this.checkSchemaVersion();
      
      if (isNewSchema) {
        // New schema: delete by verifying user ownership through list
        const user = await this.db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
          throw new Error('User not found');
        }

        const sql = `
          DELETE FROM todos 
          WHERE id = ? AND list_id IN (
            SELECT id FROM todo_lists WHERE user_id = ?
          )
        `;
        const result = await this.db.run(sql, [id, user.id]);
        
        if (result.changes === 0) {
          throw new Error(`Todo with ID ${id} not found`);
        }
      } else {
        // Old schema: delete by username
        const sql = `DELETE FROM todos WHERE id = ? AND username = ?`;
        const result = await this.db.run(sql, [id, username]);
        
        if (result.changes === 0) {
          throw new Error(`Todo with ID ${id} not found`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to delete todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Move a todo from one list to another (new schema only)
   */
  async moveTodoToList(todoId: number, targetListId: number, userId: number): Promise<Todo> {
    // Input validation
    if (!Number.isInteger(todoId) || todoId <= 0) {
      throw new Error('Todo ID must be a positive integer');
    }
    if (!Number.isInteger(targetListId) || targetListId <= 0) {
      throw new Error('Target list ID must be a positive integer');
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (!isNewSchema) {
        throw new Error('List-based operations require the new schema. Please run database migration first.');
      }

      // Verify the target list exists and belongs to the user
      const targetList = await this.db.get(
        'SELECT id FROM todo_lists WHERE id = ? AND user_id = ?',
        [targetListId, userId]
      );
      if (!targetList) {
        throw new Error('Target list not found or does not belong to user');
      }

      // Verify the todo exists and belongs to a list owned by the user
      const todo = await this.db.get(`
        SELECT t.id, t.text, t.completed, t.created_at, t.list_id
        FROM todos t
        JOIN todo_lists tl ON t.list_id = tl.id
        WHERE t.id = ? AND tl.user_id = ?
      `, [todoId, userId]);

      if (!todo) {
        throw new Error('Todo not found or does not belong to user');
      }

      // Update the todo's list association
      const sql = `UPDATE todos SET list_id = ? WHERE id = ?`;
      const result = await this.db.run(sql, [targetListId, todoId]);
      
      if (result.changes === 0) {
        throw new Error('Failed to move todo to target list');
      }

      // Retrieve the updated todo
      const updatedTodo = await this.getTodoByIdInList(todoId, targetListId);
      if (!updatedTodo) {
        throw new Error('Failed to retrieve moved todo');
      }

      return updatedTodo;
    } catch (error) {
      throw new Error(`Failed to move todo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to get a todo by ID for a specific user (returns LegacyTodo for compatibility)
   */
  private async getTodoById(id: number, username: string): Promise<LegacyTodo | null> {
    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (isNewSchema) {
        // New schema: get by user ownership through list
        const user = await this.db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (!user) {
          return null;
        }

        const sql = `
          SELECT t.id, t.text, t.completed, t.created_at, t.list_id
          FROM todos t
          JOIN todo_lists tl ON t.list_id = tl.id
          WHERE t.id = ? AND tl.user_id = ?
        `;
        
        const row = await this.db.get<TodoRow>(sql, [id, user.id]);
        return row ? this.mapToLegacyTodo(this.mapRowToTodoNewSchema(row)) : null;
      } else {
        // Old schema: get by username
        const sql = `
          SELECT id, text, completed, created_at, updated_at, username
          FROM todos 
          WHERE id = ? AND username = ?
        `;
        
        const row = await this.db.get<TodoRow>(sql, [id, username]);
        return row ? this.mapRowToTodoOldSchemaLegacy(row) : null;
      }
    } catch (error) {
      throw new Error(`Failed to retrieve todo by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to get a todo by ID within a specific list (new schema only)
   */
  private async getTodoByIdInList(id: number, listId: number): Promise<Todo | null> {
    try {
      const isNewSchema = await this.checkSchemaVersion();
      
      if (!isNewSchema) {
        throw new Error('List-based operations require the new schema. Please run database migration first.');
      }

      const sql = `
        SELECT id, text, completed, created_at, list_id
        FROM todos 
        WHERE id = ? AND list_id = ?
      `;
      
      const row = await this.db.get<TodoRow>(sql, [id, listId]);
      return row ? this.mapRowToTodoNewSchema(row) : null;
    } catch (error) {
      throw new Error(`Failed to retrieve todo by ID in list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert database row to Todo object (old schema)
   */
  private mapRowToTodoOldSchema(row: TodoRow): Todo {
    return {
      id: row.id,
      text: row.text,
      completed: Boolean(row.completed),
      list_id: 0, // Default for old schema
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Helper method to convert database row to LegacyTodo object (old schema)
   */
  private mapRowToTodoOldSchemaLegacy(row: TodoRow): LegacyTodo {
    return {
      id: row.id,
      text: row.text,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at)
    };
  }

  /**
   * Helper method to convert database row to Todo object (new schema)
   */
  private mapRowToTodoNewSchema(row: TodoRow): Todo {
    return {
      id: row.id,
      text: row.text,
      completed: Boolean(row.completed),
      list_id: row.list_id!,
      created_at: new Date(row.created_at)
    };
  }

  /**
   * Helper method to convert Todo to legacy format for backward compatibility
   */
  mapToLegacyTodo(todo: Todo): LegacyTodo {
    return {
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      createdAt: todo.created_at,
      updatedAt: todo.created_at // Use created_at as fallback for updated_at
    };
  }
}