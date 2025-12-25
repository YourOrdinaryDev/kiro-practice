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
    it('should create a new todo with valid text', async () => {
      const todoData = { text: 'Test todo item' };
      
      const createdTodo = await todoService.createTodo(todoData);
      
      expect(createdTodo).toBeDefined();
      expect(createdTodo.id).toBeGreaterThan(0);
      expect(createdTodo.text).toBe('Test todo item');
      expect(createdTodo.completed).toBe(false);
      expect(createdTodo.createdAt).toBeInstanceOf(Date);
      expect(createdTodo.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject empty text', async () => {
      const todoData = { text: '' };
      
      await expect(todoService.createTodo(todoData)).rejects.toThrow(
        'Todo text cannot be empty or contain only whitespace'
      );
    });

    it('should reject whitespace-only text', async () => {
      const todoData = { text: '   \n\t   ' };
      
      await expect(todoService.createTodo(todoData)).rejects.toThrow(
        'Todo text cannot be empty or contain only whitespace'
      );
    });

    it('should reject text longer than 500 characters', async () => {
      const todoData = { text: 'a'.repeat(501) };
      
      await expect(todoService.createTodo(todoData)).rejects.toThrow(
        'Todo text cannot exceed 500 characters'
      );
    });
  });

  describe('getAllTodos', () => {
    it('should return empty array when no todos exist', async () => {
      const todos = await todoService.getAllTodos();
      
      expect(todos).toEqual([]);
    });

    it('should return all todos ordered by completion status', async () => {
      // Create some test todos
      const todo1 = await todoService.createTodo({ text: 'First todo' });
      const todo2 = await todoService.createTodo({ text: 'Second todo' });
      
      // Mark one as completed
      await todoService.updateTodo(todo1.id, { completed: true });
      
      const todos = await todoService.getAllTodos();
      
      expect(todos).toHaveLength(2);
      // Incomplete todos should come first
      expect(todos[0].completed).toBe(false);
      expect(todos[1].completed).toBe(true);
    });
  });

  describe('updateTodo', () => {
    it('should update todo completion status', async () => {
      const createdTodo = await todoService.createTodo({ text: 'Test todo' });
      
      const updatedTodo = await todoService.updateTodo(createdTodo.id, { completed: true });
      
      expect(updatedTodo.completed).toBe(true);
      expect(updatedTodo.id).toBe(createdTodo.id);
      expect(updatedTodo.text).toBe(createdTodo.text);
    });

    it('should reject invalid todo ID', async () => {
      await expect(todoService.updateTodo(-1, { completed: true })).rejects.toThrow(
        'Todo ID must be a positive integer'
      );
    });

    it('should reject non-existent todo ID', async () => {
      await expect(todoService.updateTodo(999, { completed: true })).rejects.toThrow(
        'Todo with ID 999 not found'
      );
    });
  });

  describe('deleteTodo', () => {
    it('should delete existing todo', async () => {
      const createdTodo = await todoService.createTodo({ text: 'Test todo' });
      
      await todoService.deleteTodo(createdTodo.id);
      
      // Verify todo is deleted
      const todos = await todoService.getAllTodos();
      expect(todos).toHaveLength(0);
    });

    it('should reject invalid todo ID', async () => {
      await expect(todoService.deleteTodo(-1)).rejects.toThrow(
        'Todo ID must be a positive integer'
      );
    });

    it('should reject non-existent todo ID', async () => {
      await expect(todoService.deleteTodo(999)).rejects.toThrow(
        'Todo with ID 999 not found'
      );
    });
  });
});