import { DatabaseConnection, getDbConnection } from '../database/index.js';
import { User, TodoList, CreateUserRequest } from '../types/todo.js';

interface UserRow {
  id: number;
  username: string;
  created_at: string;
}

interface TodoListRow {
  id: number;
  name: string;
  user_id: number;
  created_at: string;
}

export class UserService {
  private db: DatabaseConnection;

  constructor(db?: DatabaseConnection) {
    this.db = db || getDbConnection();
  }

  /**
   * Get an existing user by username or create a new one if it doesn't exist.
   * This method handles session management by ensuring users always have a valid identity.
   *
   * Requirements: 1.2, 1.4
   */
  async getOrCreateUser(username: string): Promise<User> {
    // Input validation
    if (typeof username !== 'string') {
      throw new Error('Username is required and must be a string');
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length === 0) {
      throw new Error('Username cannot be empty or contain only whitespace');
    }

    if (trimmedUsername.length > 50) {
      throw new Error('Username cannot exceed 50 characters');
    }

    try {
      // First, try to get existing user
      const existingUser = await this.db.get<UserRow>(
        'SELECT id, username, created_at FROM users WHERE username = ?',
        [trimmedUsername]
      );

      if (existingUser) {
        return this.mapRowToUser(existingUser);
      }

      // User doesn't exist, create new one
      const result = await this.db.run(
        'INSERT INTO users (username) VALUES (?)',
        [trimmedUsername]
      );

      if (!result.lastID) {
        throw new Error('Failed to create user: No ID returned');
      }

      // Create default list for the new user
      await this.createDefaultList(result.lastID);

      // Retrieve the created user
      const createdUser = await this.db.get<UserRow>(
        'SELECT id, username, created_at FROM users WHERE id = ?',
        [result.lastID]
      );

      if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      }

      return this.mapRowToUser(createdUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        // Handle race condition where user was created between our check and insert
        const existingUser = await this.db.get<UserRow>(
          'SELECT id, username, created_at FROM users WHERE username = ?',
          [trimmedUsername]
        );

        if (existingUser) {
          return this.mapRowToUser(existingUser);
        }
      }

      throw new Error(
        `Failed to get or create user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a default "My Tasks" list for a new user.
   * This ensures every user has at least one list to work with immediately.
   *
   * Requirements: 7.1
   */
  async createDefaultList(userId: number): Promise<TodoList> {
    // Input validation
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    const defaultListName = 'My Tasks';

    try {
      // Check if user exists
      const user = await this.db.get('SELECT id FROM users WHERE id = ?', [
        userId,
      ]);

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Check if default list already exists for this user
      const existingList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE user_id = ? AND name = ?',
        [userId, defaultListName]
      );

      if (existingList) {
        return this.mapRowToTodoList(existingList);
      }

      // Create the default list
      const result = await this.db.run(
        'INSERT INTO todo_lists (name, user_id) VALUES (?, ?)',
        [defaultListName, userId]
      );

      if (!result.lastID) {
        throw new Error('Failed to create default list: No ID returned');
      }

      // Retrieve the created list
      const createdList = await this.db.get<TodoListRow>(
        'SELECT id, name, user_id, created_at FROM todo_lists WHERE id = ?',
        [result.lastID]
      );

      if (!createdList) {
        throw new Error('Failed to retrieve created default list');
      }

      return this.mapRowToTodoList(createdList);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint failed')
      ) {
        // Handle race condition where list was created between our check and insert
        const existingList = await this.db.get<TodoListRow>(
          'SELECT id, name, user_id, created_at FROM todo_lists WHERE user_id = ? AND name = ?',
          [userId, defaultListName]
        );

        if (existingList) {
          return this.mapRowToTodoList(existingList);
        }
      }

      throw new Error(
        `Failed to create default list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('User ID must be a positive integer');
    }

    try {
      const user = await this.db.get<UserRow>(
        'SELECT id, username, created_at FROM users WHERE id = ?',
        [id]
      );

      return user ? this.mapRowToUser(user) : null;
    } catch (error) {
      throw new Error(
        `Failed to get user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    if (typeof username !== 'string' || username.trim().length === 0) {
      throw new Error('Username is required and must be a non-empty string');
    }

    try {
      const user = await this.db.get<UserRow>(
        'SELECT id, username, created_at FROM users WHERE username = ?',
        [username.trim()]
      );

      return user ? this.mapRowToUser(user) : null;
    } catch (error) {
      throw new Error(
        `Failed to get user by username: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper method to convert database row to User object
   */
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      created_at: new Date(row.created_at),
    };
  }

  /**
   * Helper method to convert database row to TodoList object
   */
  private mapRowToTodoList(row: TodoListRow): TodoList {
    return {
      id: row.id,
      name: row.name,
      user_id: row.user_id,
      created_at: new Date(row.created_at),
    };
  }
}
