import { DatabaseConnection, getDbConnection } from '../database/index.js';
import { TodoList, CreateTodoListRequest, UpdateTodoListRequest } from '../types/todo.js';

interface TodoListRow {
  id: number;
  name: string;
  user_id: number;
  created_at: string;
  todo_count?: number;
}

export class TodoListService {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    this.db = db || getDbConnection();
  }

  /**
   * Get all todo lists for a specific user with optional todo counts.
   * Returns lists ordered by creation date.
   * 
   * Requirements: 2.4, 3.3, 5.1
   */
  async getListsForUser(userId: number, includeTodoCount: boolean = false): Promise<TodoList[]> {
    // Input validation
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    try {
      let sql: string;
      
      if (includeTodoCount) {
        sql = `
          SELECT 
            tl.id, 
            tl.name, 
            tl.user_id, 
            tl.created_at,
            COUNT(t.id) as todo_count
          FROM todo_lists tl
          LEFT JOIN todos t ON tl.id = t.list_id
          WHERE tl.user_id = ?
          GROUP BY tl.id, tl.name, tl.user_id, tl.created_at
          ORDER BY tl.created_at ASC
        `;
      } else {
        sql = `
          SELECT id, name, user_id, created_at
          FROM todo_lists 
          WHERE user_id = ?
          ORDER BY created_at ASC
        `;
      }

      const rows = await this.db.all<TodoListRow>(sql, [userId]);
      return rows.map(this.mapRowToTodoList);
    } catch (error) {
      throw new Error(`Failed to retrieve lists for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new todo list for a user.
   * Validates list name uniqueness per user and enforces naming rules.
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async createList(userId: number, name: string): Promise<TodoList> {
    // Input validation
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    if (typeof name !== 'string') {
      throw new Error('List name is required and must be a string');
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error('List name cannot be empty or contain only whitespace');
    }

    if (trimmedName.length > 100) {
      throw new Error('List name cannot exceed 100 characters');
    }

    try {
      // Verify user exists
      const user = await this.db.get(
        'SELECT id FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Check for duplicate list name for this user
      const existingList = await this.db.get(
        'SELECT id FROM todo_lists WHERE user_id = ? AND name = ?',
        [userId, trimmedName]
      );

      if (existingList) {
        throw new Error(`A list named "${trimmedName}" already exists for this user`);
      }

      // Create the new list
      const result = await this.db.run(
        'INSERT INTO todo_lists (name, user_id) VALUES (?, ?)',
        [trimmedName, userId]
      );

      if (!result.lastID) {
        throw new Error('Failed to create list: No ID returned');
      }

      // Retrieve the created list
      const createdList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?',
        [result.lastID]
      );

      if (!createdList) {
        throw new Error('Failed to retrieve created list');
      }

      return this.mapRowToTodoList(createdList);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`A list named "${trimmedName}" already exists for this user`);
      }
      throw new Error(`Failed to create list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a todo list's name.
   * Validates ownership, name uniqueness, and preserves all todos.
   * 
   * Requirements: 3.1, 3.4
   */
  async updateListName(listId: number, name: string, userId?: number): Promise<TodoList> {
    // Input validation
    if (!Number.isInteger(listId) || listId <= 0) {
      throw new Error('List ID must be a positive integer');
    }

    if (typeof name !== 'string') {
      throw new Error('List name is required and must be a string');
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      throw new Error('List name cannot be empty or contain only whitespace');
    }

    if (trimmedName.length > 100) {
      throw new Error('List name cannot exceed 100 characters');
    }

    try {
      // Get the existing list to verify ownership
      const existingList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?',
        [listId]
      );

      if (!existingList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      // If userId is provided, validate ownership
      if (userId !== undefined && existingList.user_id !== userId) {
        throw new Error(`List with ID ${listId} not found`); // Don't reveal existence to unauthorized users
      }

      // Check if the new name conflicts with existing lists for this user
      const conflictingList = await this.db.get(
        'SELECT id FROM todo_lists WHERE user_id = ? AND name = ? AND id != ?',
        [existingList.user_id, trimmedName, listId]
      );

      if (conflictingList) {
        throw new Error(`A list named "${trimmedName}" already exists for this user`);
      }

      // Update the list name
      const result = await this.db.run(
        'UPDATE todo_lists SET name = ? WHERE id = ?',
        [trimmedName, listId]
      );

      if (result.changes === 0) {
        throw new Error(`List with ID ${listId} not found`);
      }

      // Retrieve the updated list
      const updatedList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?',
        [listId]
      );

      if (!updatedList) {
        throw new Error('Failed to retrieve updated list');
      }

      return this.mapRowToTodoList(updatedList);
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`A list named "${trimmedName}" already exists for this user`);
      }
      throw new Error(`Failed to update list name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a todo list and all associated todos.
   * Validates ownership and enforces minimum list requirement.
   * 
   * Requirements: 3.2, 7.2, 7.3
   */
  async deleteList(listId: number, userId?: number): Promise<void> {
    // Input validation
    if (!Number.isInteger(listId) || listId <= 0) {
      throw new Error('List ID must be a positive integer');
    }

    try {
      // Get the existing list to verify ownership
      const existingList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?',
        [listId]
      );

      if (!existingList) {
        throw new Error(`List with ID ${listId} not found`);
      }

      // If userId is provided, validate ownership
      if (userId !== undefined && existingList.user_id !== userId) {
        throw new Error(`List with ID ${listId} not found`); // Don't reveal existence to unauthorized users
      }

      // Check if this is the user's last list (enforce minimum list requirement)
      const userListCount = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM todo_lists WHERE user_id = ?',
        [existingList.user_id]
      );

      if (userListCount && userListCount.count <= 1) {
        throw new Error('Cannot delete the last remaining list. Users must have at least one list.');
      }

      // Delete the list (todos will be cascade deleted due to foreign key constraint)
      const result = await this.db.run(
        'DELETE FROM todo_lists WHERE id = ?',
        [listId]
      );

      if (result.changes === 0) {
        throw new Error(`List with ID ${listId} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that a user owns a specific list.
   * Used for authorization checks in API endpoints.
   * 
   * Requirements: 1.3, 2.4, 3.3
   */
  async validateListOwnership(listId: number, userId: number): Promise<boolean> {
    // Input validation
    if (!Number.isInteger(listId) || listId <= 0) {
      throw new Error('List ID must be a positive integer');
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    try {
      const list = await this.db.get(
        'SELECT id FROM todo_lists WHERE id = ? AND user_id = ?',
        [listId, userId]
      );

      return !!list;
    } catch (error) {
      throw new Error(`Failed to validate list ownership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific todo list by ID with ownership validation.
   * 
   * Requirements: 1.3, 2.4
   */
  async getListById(listId: number, userId?: number): Promise<TodoList | null> {
    // Input validation
    if (!Number.isInteger(listId) || listId <= 0) {
      throw new Error('List ID must be a positive integer');
    }

    try {
      let sql: string;
      let params: any[];

      if (userId !== undefined) {
        // Validate ownership
        if (!Number.isInteger(userId) || userId <= 0) {
          throw new Error('User ID must be a positive integer');
        }
        sql = 'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ? AND user_id = ?';
        params = [listId, userId];
      } else {
        sql = 'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?';
        params = [listId];
      }

      const list = await this.db.get<TodoListRow>(sql, params);
      return list ? this.mapRowToTodoList(list) : null;
    } catch (error) {
      throw new Error(`Failed to get list by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert database row to TodoList object
   */
  private mapRowToTodoList(row: TodoListRow): TodoList {
    const todoList: TodoList = {
      id: row.id,
      name: row.name,
      user_id: row.user_id,
      created_at: new Date(row.created_at)
    };

    // Include todo_count if it was selected
    if (row.todo_count !== undefined) {
      todoList.todo_count = row.todo_count;
    }

    return todoList;
  }
}