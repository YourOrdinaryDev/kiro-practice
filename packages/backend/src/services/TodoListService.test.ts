import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from '../database/connection.js';
import { TodoListService } from './TodoListService.js';
import { UserService } from './UserService.js';
import { DatabaseMigrations } from '../database/migrations.js';

describe('TodoListService', () => {
  let db: DatabaseConnection;
  let todoListService: TodoListService;
  let userService: UserService;
  let testUserId: number;

  beforeEach(async () => {
    // Create a test database connection
    db = new DatabaseConnection('test-todolist-service.db');
    await db.connect();
    
    // Initialize database with migrations
    const migrations = new DatabaseMigrations(db);
    await migrations.initializeDatabase();
    
    // Initialize services
    todoListService = new TodoListService(db);
    userService = new UserService(db);
    
    // Create a test user
    const user = await userService.getOrCreateUser('testuser');
    testUserId = user.id;
  });

  afterEach(async () => {
    // Clean up database
    try {
      await db.run('DELETE FROM todos');
      await db.run('DELETE FROM todo_lists');
      await db.run('DELETE FROM users');
    } catch (error) {
      // Ignore cleanup errors
    }
    await db.close();
  });

  describe('getListsForUser', () => {
    it('should return empty array when user has no lists', async () => {
      // Create a new user without any lists by manually creating user without default list
      const result = await db.run('INSERT INTO users (username) VALUES (?)', ['emptyuser']);
      const emptyUserId = result.lastID!;
      
      const lists = await todoListService.getListsForUser(emptyUserId);
      expect(lists).toEqual([]);
    });

    it('should return default list for new user', async () => {
      const lists = await todoListService.getListsForUser(testUserId);
      
      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('My Tasks');
      expect(lists[0].user_id).toBe(testUserId);
      expect(lists[0].id).toBeGreaterThan(0);
      expect(lists[0].created_at).toBeInstanceOf(Date);
    });

    it('should return multiple lists ordered by creation date', async () => {
      // Create additional lists
      await todoListService.createList(testUserId, 'Work Tasks');
      await todoListService.createList(testUserId, 'Personal Tasks');
      
      const lists = await todoListService.getListsForUser(testUserId);
      
      expect(lists).toHaveLength(3);
      expect(lists[0].name).toBe('My Tasks'); // First created (default)
      expect(lists[1].name).toBe('Work Tasks');
      expect(lists[2].name).toBe('Personal Tasks');
    });

    it('should include todo counts when requested', async () => {
      const lists = await todoListService.getListsForUser(testUserId, true);
      
      expect(lists).toHaveLength(1);
      expect(lists[0]).toHaveProperty('todo_count');
      expect(lists[0].todo_count).toBe(0); // No todos yet
    });

    it('should reject invalid user ID', async () => {
      await expect(todoListService.getListsForUser(-1)).rejects.toThrow('User ID must be a positive integer');
      await expect(todoListService.getListsForUser(0)).rejects.toThrow('User ID must be a positive integer');
    });
  });

  describe('createList', () => {
    it('should create a new list with valid name', async () => {
      const listName = 'Shopping List';
      const list = await todoListService.createList(testUserId, listName);
      
      expect(list.name).toBe(listName);
      expect(list.user_id).toBe(testUserId);
      expect(list.id).toBeGreaterThan(0);
      expect(list.created_at).toBeInstanceOf(Date);
    });

    it('should reject empty list name', async () => {
      await expect(todoListService.createList(testUserId, '')).rejects.toThrow('List name cannot be empty or contain only whitespace');
      await expect(todoListService.createList(testUserId, '   ')).rejects.toThrow('List name cannot be empty or contain only whitespace');
    });

    it('should reject duplicate list names for same user', async () => {
      const listName = 'Duplicate List';
      await todoListService.createList(testUserId, listName);
      
      await expect(todoListService.createList(testUserId, listName)).rejects.toThrow(`A list named "${listName}" already exists for this user`);
    });

    it('should allow same list name for different users', async () => {
      const listName = 'Shared Name';
      const otherUser = await userService.getOrCreateUser('otheruser');
      
      const list1 = await todoListService.createList(testUserId, listName);
      const list2 = await todoListService.createList(otherUser.id, listName);
      
      expect(list1.name).toBe(listName);
      expect(list2.name).toBe(listName);
      expect(list1.user_id).toBe(testUserId);
      expect(list2.user_id).toBe(otherUser.id);
    });

    it('should reject invalid user ID', async () => {
      await expect(todoListService.createList(-1, 'Test List')).rejects.toThrow('User ID must be a positive integer');
      await expect(todoListService.createList(0, 'Test List')).rejects.toThrow('User ID must be a positive integer');
    });

    it('should reject non-existent user ID', async () => {
      await expect(todoListService.createList(99999, 'Test List')).rejects.toThrow('User with ID 99999 not found');
    });

    it('should reject list name longer than 100 characters', async () => {
      const longName = 'a'.repeat(101);
      await expect(todoListService.createList(testUserId, longName)).rejects.toThrow('List name cannot exceed 100 characters');
    });

    it('should trim whitespace from list name', async () => {
      const list = await todoListService.createList(testUserId, '  Trimmed List  ');
      expect(list.name).toBe('Trimmed List');
    });
  });

  describe('updateListName', () => {
    let listId: number;

    beforeEach(async () => {
      const list = await todoListService.createList(testUserId, 'Original Name');
      listId = list.id;
    });

    it('should update list name successfully', async () => {
      const newName = 'Updated Name';
      const updatedList = await todoListService.updateListName(listId, newName);
      
      expect(updatedList.name).toBe(newName);
      expect(updatedList.id).toBe(listId);
      expect(updatedList.user_id).toBe(testUserId);
    });

    it('should reject empty new name', async () => {
      await expect(todoListService.updateListName(listId, '')).rejects.toThrow('List name cannot be empty or contain only whitespace');
      await expect(todoListService.updateListName(listId, '   ')).rejects.toThrow('List name cannot be empty or contain only whitespace');
    });

    it('should reject duplicate name for same user', async () => {
      await todoListService.createList(testUserId, 'Existing Name');
      
      await expect(todoListService.updateListName(listId, 'Existing Name')).rejects.toThrow('A list named "Existing Name" already exists for this user');
    });

    it('should allow updating to same name (no change)', async () => {
      const originalName = 'Original Name';
      const updatedList = await todoListService.updateListName(listId, originalName);
      
      expect(updatedList.name).toBe(originalName);
    });

    it('should validate ownership when userId provided', async () => {
      const otherUser = await userService.getOrCreateUser('otheruser');
      
      await expect(todoListService.updateListName(listId, 'New Name', otherUser.id)).rejects.toThrow(`List with ID ${listId} not found`);
    });

    it('should reject invalid list ID', async () => {
      await expect(todoListService.updateListName(-1, 'New Name')).rejects.toThrow('List ID must be a positive integer');
      await expect(todoListService.updateListName(0, 'New Name')).rejects.toThrow('List ID must be a positive integer');
    });

    it('should reject non-existent list ID', async () => {
      await expect(todoListService.updateListName(99999, 'New Name')).rejects.toThrow('List with ID 99999 not found');
    });
  });

  describe('deleteList', () => {
    let listId: number;

    beforeEach(async () => {
      const list = await todoListService.createList(testUserId, 'To Delete');
      listId = list.id;
    });

    it('should delete list successfully', async () => {
      await todoListService.deleteList(listId);
      
      // Verify list is deleted
      const list = await todoListService.getListById(listId);
      expect(list).toBeNull();
    });

    it('should prevent deleting last remaining list', async () => {
      // Get the default list
      const lists = await todoListService.getListsForUser(testUserId);
      const defaultListId = lists.find(l => l.name === 'My Tasks')!.id;
      
      // Delete the additional list first
      await todoListService.deleteList(listId);
      
      // Try to delete the last remaining list
      await expect(todoListService.deleteList(defaultListId)).rejects.toThrow('Cannot delete the last remaining list. Users must have at least one list.');
    });

    it('should validate ownership when userId provided', async () => {
      const otherUser = await userService.getOrCreateUser('otheruser');
      
      await expect(todoListService.deleteList(listId, otherUser.id)).rejects.toThrow(`List with ID ${listId} not found`);
    });

    it('should reject invalid list ID', async () => {
      await expect(todoListService.deleteList(-1)).rejects.toThrow('List ID must be a positive integer');
      await expect(todoListService.deleteList(0)).rejects.toThrow('List ID must be a positive integer');
    });

    it('should reject non-existent list ID', async () => {
      await expect(todoListService.deleteList(99999)).rejects.toThrow('List with ID 99999 not found');
    });
  });

  describe('validateListOwnership', () => {
    let listId: number;

    beforeEach(async () => {
      const list = await todoListService.createList(testUserId, 'Ownership Test');
      listId = list.id;
    });

    it('should return true for valid ownership', async () => {
      const isOwner = await todoListService.validateListOwnership(listId, testUserId);
      expect(isOwner).toBe(true);
    });

    it('should return false for invalid ownership', async () => {
      const otherUser = await userService.getOrCreateUser('otheruser');
      const isOwner = await todoListService.validateListOwnership(listId, otherUser.id);
      expect(isOwner).toBe(false);
    });

    it('should return false for non-existent list', async () => {
      const isOwner = await todoListService.validateListOwnership(99999, testUserId);
      expect(isOwner).toBe(false);
    });

    it('should reject invalid IDs', async () => {
      await expect(todoListService.validateListOwnership(-1, testUserId)).rejects.toThrow('List ID must be a positive integer');
      await expect(todoListService.validateListOwnership(listId, -1)).rejects.toThrow('User ID must be a positive integer');
    });
  });

  describe('getListById', () => {
    let listId: number;

    beforeEach(async () => {
      const list = await todoListService.createList(testUserId, 'Get By ID Test');
      listId = list.id;
    });

    it('should return list when it exists', async () => {
      const list = await todoListService.getListById(listId);
      
      expect(list).not.toBeNull();
      expect(list!.id).toBe(listId);
      expect(list!.name).toBe('Get By ID Test');
      expect(list!.user_id).toBe(testUserId);
    });

    it('should return null when list does not exist', async () => {
      const list = await todoListService.getListById(99999);
      expect(list).toBeNull();
    });

    it('should validate ownership when userId provided', async () => {
      const otherUser = await userService.getOrCreateUser('otheruser');
      
      const list = await todoListService.getListById(listId, otherUser.id);
      expect(list).toBeNull();
    });

    it('should return list when ownership is valid', async () => {
      const list = await todoListService.getListById(listId, testUserId);
      
      expect(list).not.toBeNull();
      expect(list!.id).toBe(listId);
    });

    it('should reject invalid list ID', async () => {
      await expect(todoListService.getListById(-1)).rejects.toThrow('List ID must be a positive integer');
      await expect(todoListService.getListById(0)).rejects.toThrow('List ID must be a positive integer');
    });

    it('should reject invalid user ID when provided', async () => {
      await expect(todoListService.getListById(listId, -1)).rejects.toThrow('User ID must be a positive integer');
      await expect(todoListService.getListById(listId, 0)).rejects.toThrow('User ID must be a positive integer');
    });
  });
});