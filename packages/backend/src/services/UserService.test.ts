import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserService } from './UserService.js';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseMigrations } from '../database/migrations.js';
import fs from 'fs';

describe('UserService', () => {
  let userService: UserService;
  let db: DatabaseConnection;
  const testDbPath = 'test-user-service.db';

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create a new database connection for testing
    db = new DatabaseConnection(testDbPath);
    await db.connect();
    
    // Initialize the database with migrations using the test database
    const migrations = new DatabaseMigrations(db);
    await migrations.initializeDatabase();
    
    userService = new UserService(db);
  });

  afterEach(async () => {
    await db.close();
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('getOrCreateUser', () => {
    it('should create a new user when username does not exist', async () => {
      const username = 'testuser';
      
      const user = await userService.getOrCreateUser(username);
      
      expect(user).toBeDefined();
      expect(user.username).toBe(username);
      expect(user.id).toBeGreaterThan(0);
      expect(user.created_at).toBeInstanceOf(Date);
    });

    it('should return existing user when username already exists', async () => {
      const username = 'existinguser';
      
      // Create user first time
      const firstUser = await userService.getOrCreateUser(username);
      
      // Get user second time
      const secondUser = await userService.getOrCreateUser(username);
      
      expect(firstUser.id).toBe(secondUser.id);
      expect(firstUser.username).toBe(secondUser.username);
      expect(firstUser.created_at.getTime()).toBe(secondUser.created_at.getTime());
    });

    it('should create default list when creating new user', async () => {
      const username = 'newuser';
      
      const user = await userService.getOrCreateUser(username);
      
      // Check that default list was created
      const lists = await db.all(
        'SELECT * FROM todo_lists WHERE user_id = ? AND name = ?',
        [user.id, 'My Tasks']
      );
      
      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('My Tasks');
      expect(lists[0].user_id).toBe(user.id);
    });

    it('should reject empty username', async () => {
      await expect(userService.getOrCreateUser('')).rejects.toThrow(
        'Username cannot be empty or contain only whitespace'
      );
    });

    it('should reject whitespace-only username', async () => {
      await expect(userService.getOrCreateUser('   ')).rejects.toThrow(
        'Username cannot be empty or contain only whitespace'
      );
    });

    it('should reject non-string username', async () => {
      await expect(userService.getOrCreateUser(123 as any)).rejects.toThrow(
        'Username is required and must be a string'
      );
    });

    it('should reject username longer than 50 characters', async () => {
      const longUsername = 'a'.repeat(51);
      await expect(userService.getOrCreateUser(longUsername)).rejects.toThrow(
        'Username cannot exceed 50 characters'
      );
    });

    it('should trim whitespace from username', async () => {
      const username = '  testuser  ';
      
      const user = await userService.getOrCreateUser(username);
      
      expect(user.username).toBe('testuser');
    });
  });

  describe('createDefaultList', () => {
    it('should create default list for existing user', async () => {
      // First create a user
      const user = await userService.getOrCreateUser('testuser');
      
      // Delete the default list that was auto-created
      await db.run('DELETE FROM todo_lists WHERE user_id = ?', [user.id]);
      
      // Now create default list manually
      const defaultList = await userService.createDefaultList(user.id);
      
      expect(defaultList).toBeDefined();
      expect(defaultList.name).toBe('My Tasks');
      expect(defaultList.user_id).toBe(user.id);
      expect(defaultList.id).toBeGreaterThan(0);
      expect(defaultList.created_at).toBeInstanceOf(Date);
    });

    it('should return existing default list if it already exists', async () => {
      // Create a user (which auto-creates default list)
      const user = await userService.getOrCreateUser('testuser');
      
      // Try to create default list again
      const defaultList = await userService.createDefaultList(user.id);
      
      expect(defaultList.name).toBe('My Tasks');
      expect(defaultList.user_id).toBe(user.id);
      
      // Verify only one default list exists
      const lists = await db.all(
        'SELECT * FROM todo_lists WHERE user_id = ? AND name = ?',
        [user.id, 'My Tasks']
      );
      expect(lists).toHaveLength(1);
    });

    it('should reject invalid user ID', async () => {
      await expect(userService.createDefaultList(0)).rejects.toThrow(
        'User ID must be a positive integer'
      );
      
      await expect(userService.createDefaultList(-1)).rejects.toThrow(
        'User ID must be a positive integer'
      );
      
      await expect(userService.createDefaultList(1.5)).rejects.toThrow(
        'User ID must be a positive integer'
      );
    });

    it('should reject non-existent user ID', async () => {
      await expect(userService.createDefaultList(999)).rejects.toThrow(
        'User with ID 999 not found'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when ID exists', async () => {
      const username = 'testuser';
      const createdUser = await userService.getOrCreateUser(username);
      
      const foundUser = await userService.getUserById(createdUser.id);
      
      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(username);
    });

    it('should return null when user ID does not exist', async () => {
      const user = await userService.getUserById(999);
      expect(user).toBeNull();
    });

    it('should reject invalid user ID', async () => {
      await expect(userService.getUserById(0)).rejects.toThrow(
        'User ID must be a positive integer'
      );
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when username exists', async () => {
      const username = 'testuser';
      const createdUser = await userService.getOrCreateUser(username);
      
      const foundUser = await userService.getUserByUsername(username);
      
      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.username).toBe(username);
    });

    it('should return null when username does not exist', async () => {
      const user = await userService.getUserByUsername('nonexistent');
      expect(user).toBeNull();
    });

    it('should reject empty username', async () => {
      await expect(userService.getUserByUsername('')).rejects.toThrow(
        'Username is required and must be a non-empty string'
      );
    });

    it('should trim whitespace from username', async () => {
      const username = 'testuser';
      await userService.getOrCreateUser(username);
      
      const foundUser = await userService.getUserByUsername('  testuser  ');
      
      expect(foundUser).toBeDefined();
      expect(foundUser!.username).toBe(username);
    });
  });
});