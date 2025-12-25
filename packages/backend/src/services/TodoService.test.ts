import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoService } from './TodoService.js';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseMigrations } from '../database/migrations.js';
import fs from 'fs';
import path from 'path';

describe('TodoService', () => {
  let todoService: TodoService;
  let testDb: DatabaseConnection;
  const testDbPath = 'test-todos.db';
  const testUsername = 'testuser';

  beforeEach(async () => {
    // Create a test database
    testDb = new DatabaseConnection(testDbPath);
    await testDb.connect();
    
    // Initialize the test database
    const migrations = new DatabaseMigrations(testDb);
    await migrations.initializeDatabase();
    await migrations.createUpdateTrigger();
    
    // Create TodoService with test database
    todoService = new TodoService(testDb);
  });

  afterEach(async () => {
    // Clean up test database
    await testDb.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('createTodo', () => {
    it('should create a new todo with valid text for a specific user', async () => {
      const todoData = { text: 'Test todo item' };
      
      const createdTodo = await todoService.createTodo(testUsername, todoData);
      
      expect(createdTodo).toBeDefined();
      expect(createdTodo.id).toBeGreaterThan(0);
      expect(createdTodo.text).toBe('Test todo item');
      expect(createdTodo.completed).toBe(false);
      expect(createdTodo.createdAt).toBeInstanceOf(Date);
      expect(createdTodo.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject empty text', async () => {
      const todoData = { text: '' };
      
      await expect(todoService.createTodo(testUsername, todoData)).rejects.toThrow(
        'Todo text cannot be empty or contain only whitespace'
      );
    });

    it('should reject whitespace-only text', async () => {
      const todoData = { text: '   \n\t   ' };
      
      await expect(todoService.createTodo(testUsername, todoData)).rejects.toThrow(
        'Todo text cannot be empty or contain only whitespace'
      );
    });

    it('should reject text longer than 500 characters', async () => {
      const todoData = { text: 'a'.repeat(501) };
      
      await expect(todoService.createTodo(testUsername, todoData)).rejects.toThrow(
        'Todo text cannot exceed 500 characters'
      );
    });
  });

  describe('getAllTodos', () => {
    it('should return empty array when no todos exist for user', async () => {
      const todos = await todoService.getAllTodos(testUsername);
      
      expect(todos).toEqual([]);
    });

    it('should return only todos for the specific user', async () => {
      // Create todos for different users
      const todo1 = await todoService.createTodo(testUsername, { text: 'User1 todo' });
      const todo2 = await todoService.createTodo('otheruser', { text: 'User2 todo' });
      
      const userTodos = await todoService.getAllTodos(testUsername);
      
      expect(userTodos).toHaveLength(1);
      expect(userTodos[0].text).toBe('User1 todo');
    });

    it('should return all todos for user ordered by completion status', async () => {
      // Create some test todos for the user
      const todo1 = await todoService.createTodo(testUsername, { text: 'First todo' });
      const todo2 = await todoService.createTodo(testUsername, { text: 'Second todo' });
      
      // Mark one as completed
      await todoService.updateTodo(testUsername, todo1.id, { completed: true });
      
      const todos = await todoService.getAllTodos(testUsername);
      
      expect(todos).toHaveLength(2);
      // Incomplete todos should come first
      expect(todos[0].completed).toBe(false);
      expect(todos[1].completed).toBe(true);
    });
  });

  describe('updateTodo', () => {
    it('should update todo completion status for owned todo', async () => {
      const createdTodo = await todoService.createTodo(testUsername, { text: 'Test todo' });
      
      const updatedTodo = await todoService.updateTodo(testUsername, createdTodo.id, { completed: true });
      
      expect(updatedTodo.completed).toBe(true);
      expect(updatedTodo.id).toBe(createdTodo.id);
      expect(updatedTodo.text).toBe(createdTodo.text);
    });

    it('should reject updating todo owned by different user', async () => {
      const createdTodo = await todoService.createTodo('otheruser', { text: 'Other user todo' });
      
      await expect(todoService.updateTodo(testUsername, createdTodo.id, { completed: true })).rejects.toThrow(
        `Todo with ID ${createdTodo.id} not found`
      );
    });

    it('should reject invalid todo ID', async () => {
      await expect(todoService.updateTodo(testUsername, -1, { completed: true })).rejects.toThrow(
        'Todo ID must be a positive integer'
      );
    });

    it('should reject non-existent todo ID', async () => {
      await expect(todoService.updateTodo(testUsername, 999, { completed: true })).rejects.toThrow(
        'Todo with ID 999 not found'
      );
    });
  });

  describe('deleteTodo', () => {
    it('should delete existing todo owned by user', async () => {
      const createdTodo = await todoService.createTodo(testUsername, { text: 'Test todo' });
      
      await todoService.deleteTodo(testUsername, createdTodo.id);
      
      // Verify todo is deleted
      const todos = await todoService.getAllTodos(testUsername);
      expect(todos).toHaveLength(0);
    });

    it('should reject deleting todo owned by different user', async () => {
      const createdTodo = await todoService.createTodo('otheruser', { text: 'Other user todo' });
      
      await expect(todoService.deleteTodo(testUsername, createdTodo.id)).rejects.toThrow(
        `Todo with ID ${createdTodo.id} not found`
      );
    });

    it('should reject invalid todo ID', async () => {
      await expect(todoService.deleteTodo(testUsername, -1)).rejects.toThrow(
        'Todo ID must be a positive integer'
      );
    });

    it('should reject non-existent todo ID', async () => {
      await expect(todoService.deleteTodo(testUsername, 999)).rejects.toThrow(
        'Todo with ID 999 not found'
      );
    });
  });
});