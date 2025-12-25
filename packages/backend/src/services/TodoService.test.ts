import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoService } from './TodoService.js';
import { UserService } from './UserService.js';
import { TodoListService } from './TodoListService.js';
import { DatabaseConnection } from '../database/connection.js';
import { DatabaseMigrations } from '../database/migrations.js';
import fs from 'fs';
import path from 'path';

describe('TodoService', () => {
  let todoService: TodoService;
  let userService: UserService;
  let todoListService: TodoListService;
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
    
    // Create services with test database
    todoService = new TodoService(testDb);
    userService = new UserService(testDb);
    todoListService = new TodoListService(testDb);
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

  describe('List-based operations (new schema)', () => {
    let userId: number;
    let listId1: number;
    let listId2: number;

    beforeEach(async () => {
      // Create a user and lists for testing
      const user = await userService.getOrCreateUser(testUsername);
      userId = user.id;
      
      const list1 = await todoListService.createList(userId, 'Work Tasks');
      const list2 = await todoListService.createList(userId, 'Personal Tasks');
      listId1 = list1.id;
      listId2 = list2.id;
    });

    describe('getTodosInList', () => {
      it('should return empty array when list has no todos', async () => {
        const todos = await todoService.getTodosInList(listId1);
        expect(todos).toEqual([]);
      });

      it('should return only todos from the specified list', async () => {
        // Create todos in different lists
        const todo1 = await todoService.createTodoInList(listId1, 'Work todo');
        const todo2 = await todoService.createTodoInList(listId2, 'Personal todo');
        
        const workTodos = await todoService.getTodosInList(listId1);
        const personalTodos = await todoService.getTodosInList(listId2);
        
        expect(workTodos).toHaveLength(1);
        expect(workTodos[0].text).toBe('Work todo');
        expect(workTodos[0].list_id).toBe(listId1);
        
        expect(personalTodos).toHaveLength(1);
        expect(personalTodos[0].text).toBe('Personal todo');
        expect(personalTodos[0].list_id).toBe(listId2);
      });
    });

    describe('createTodoInList', () => {
      it('should create a todo in the specified list', async () => {
        const todo = await todoService.createTodoInList(listId1, 'Test todo');
        
        expect(todo.text).toBe('Test todo');
        expect(todo.list_id).toBe(listId1);
        expect(todo.completed).toBe(false);
        expect(todo.id).toBeGreaterThan(0);
      });

      it('should reject empty text', async () => {
        await expect(todoService.createTodoInList(listId1, '')).rejects.toThrow(
          'Todo text cannot be empty or contain only whitespace'
        );
      });

      it('should reject non-existent list', async () => {
        await expect(todoService.createTodoInList(999, 'Test todo')).rejects.toThrow(
          'List not found'
        );
      });
    });

    describe('moveTodoToList', () => {
      it('should move a todo from one list to another', async () => {
        // Create a todo in list1
        const originalTodo = await todoService.createTodoInList(listId1, 'Movable todo');
        
        // Move it to list2
        const movedTodo = await todoService.moveTodoToList(originalTodo.id, listId2, userId);
        
        expect(movedTodo.id).toBe(originalTodo.id);
        expect(movedTodo.text).toBe('Movable todo');
        expect(movedTodo.completed).toBe(originalTodo.completed);
        expect(movedTodo.list_id).toBe(listId2);
        
        // Verify it's no longer in the original list
        const list1Todos = await todoService.getTodosInList(listId1);
        expect(list1Todos).toHaveLength(0);
        
        // Verify it's in the target list
        const list2Todos = await todoService.getTodosInList(listId2);
        expect(list2Todos).toHaveLength(1);
        expect(list2Todos[0].id).toBe(originalTodo.id);
      });

      it('should preserve completion status when moving', async () => {
        // Create and complete a todo
        const originalTodo = await todoService.createTodoInList(listId1, 'Completed todo');
        await todoService.updateTodo(testUsername, originalTodo.id, { completed: true });
        
        // Move it to another list
        const movedTodo = await todoService.moveTodoToList(originalTodo.id, listId2, userId);
        
        expect(movedTodo.completed).toBe(true);
      });

      it('should reject moving to non-existent list', async () => {
        const todo = await todoService.createTodoInList(listId1, 'Test todo');
        
        await expect(todoService.moveTodoToList(todo.id, 999, userId)).rejects.toThrow(
          'Target list not found or does not belong to user'
        );
      });

      it('should reject moving non-existent todo', async () => {
        await expect(todoService.moveTodoToList(999, listId2, userId)).rejects.toThrow(
          'Todo not found or does not belong to user'
        );
      });

      it('should reject moving todo to list owned by different user', async () => {
        // Create another user and their list
        const otherUser = await userService.getOrCreateUser('otheruser');
        const otherList = await todoListService.createList(otherUser.id, 'Other List');
        
        // Create a todo in our list
        const todo = await todoService.createTodoInList(listId1, 'My todo');
        
        // Try to move it to the other user's list
        await expect(todoService.moveTodoToList(todo.id, otherList.id, userId)).rejects.toThrow(
          'Target list not found or does not belong to user'
        );
      });
    });

    describe('createTodo with list_id', () => {
      it('should create todo in specified list when list_id is provided', async () => {
        const todo = await todoService.createTodo(testUsername, { 
          text: 'Test todo', 
          list_id: listId1 
        });
        
        // Verify it was created in the correct list
        const listTodos = await todoService.getTodosInList(listId1);
        expect(listTodos).toHaveLength(1);
        expect(listTodos[0].id).toBe(todo.id);
      });

      it('should reject creating todo in list owned by different user', async () => {
        // Create another user and their list
        const otherUser = await userService.getOrCreateUser('otheruser');
        const otherList = await todoListService.createList(otherUser.id, 'Other List');
        
        await expect(todoService.createTodo(testUsername, { 
          text: 'Test todo', 
          list_id: otherList.id 
        })).rejects.toThrow('List not found or does not belong to user');
      });
    });
  });
});