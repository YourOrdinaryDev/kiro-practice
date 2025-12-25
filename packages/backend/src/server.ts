import Fastify from 'fastify';
import { initializeDatabase, closeDatabase } from './database/index.js';
import { TodoService } from './services/TodoService.js';
import { UserService } from './services/UserService.js';
import { TodoListService } from './services/TodoListService.js';
import {
  sessionMiddleware,
  extractUsername,
} from './middleware/sessionMiddleware.js';
import type {
  ApiError,
  ApiResponse,
  CreateTodoListRequest,
  UpdateTodoListRequest,
  MoveTodoRequest,
  Todo,
} from './types/todo.js';

const fastify = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      strict: 'log',
      keywords: ['kind', 'modifier'],
    },
  },
});

// Register JSON schema definitions
fastify.addSchema({
  $id: 'todo',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    text: { type: 'string' },
    completed: { type: 'boolean' },
    list_id: { type: 'integer' },
    created_at: { type: 'string', format: 'date-time' },
    // Legacy fields for backward compatibility
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'text', 'completed', 'created_at'],
});

fastify.addSchema({
  $id: 'createTodoRequest',
  type: 'object',
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 },
  },
  required: ['text'],
});

fastify.addSchema({
  $id: 'updateTodoRequest',
  type: 'object',
  properties: {
    completed: { type: 'boolean' },
  },
  required: ['completed'],
});

// User schemas
fastify.addSchema({
  $id: 'user',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'username', 'created_at'],
});

fastify.addSchema({
  $id: 'createUserRequest',
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 50 },
  },
  required: ['username'],
});

// TodoList schemas
fastify.addSchema({
  $id: 'todoList',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    user_id: { type: 'integer' },
    created_at: { type: 'string', format: 'date-time' },
    todo_count: { type: 'integer' },
  },
  required: ['id', 'name', 'user_id', 'created_at'],
});

fastify.addSchema({
  $id: 'createTodoListRequest',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
  },
  required: ['name'],
});

fastify.addSchema({
  $id: 'updateTodoListRequest',
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
  },
  required: ['name'],
});

fastify.addSchema({
  $id: 'moveTodoRequest',
  type: 'object',
  properties: {
    target_list_id: { type: 'integer', minimum: 1 },
  },
  required: ['target_list_id'],
});

// Register CORS plugin
await fastify.register(import('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Allow frontend origins
  credentials: true,
});

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  const { log } = fastify;

  // Log the error for debugging
  log.error(error);

  // Handle validation errors
  if (error.validation) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.validation,
      },
    };
    return reply.status(400).send(errorResponse);
  }

  // Handle authentication errors (username validation failures)
  if (
    error.message &&
    error.message.includes('Username not found in request')
  ) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required. Valid username must be provided.',
      },
    };
    return reply.status(401).send(errorResponse);
  }

  // Handle service-level validation errors (like whitespace-only text)
  if (
    error.message &&
    (error.message.includes('cannot be empty') ||
      error.message.includes('whitespace') ||
      error.message.includes('is required') ||
      error.message.includes('cannot exceed') ||
      error.message.includes('not found'))
  ) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
    };
    return reply.status(400).send(errorResponse);
  }

  // Handle not found errors
  if (error.statusCode === 404) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    };
    return reply.status(404).send(errorResponse);
  }

  // Handle database errors
  if (error.message.includes('SQLITE') || error.message.includes('database')) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    };
    return reply.status(500).send(errorResponse);
  }

  // Handle generic server errors
  const errorResponse: ApiError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };
  return reply.status(500).send(errorResponse);
});

// Global not found handler
fastify.setNotFoundHandler(async (request, reply) => {
  const errorResponse: ApiError = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    },
  };
  return reply.status(404).send(errorResponse);
});

// Health check route
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API route
fastify.get('/api/hello', async () => {
  return { message: 'Hello from Fastify backend!' };
});

// User management endpoints

// GET /api/users/:username - Get or create user by username
fastify.get(
  '/api/users/:username',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 1, maxLength: 50 },
        },
        required: ['username'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { $ref: 'user#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { username } = request.params as { username: string };
      const user = await userService.getOrCreateUser(username);
      const response: ApiResponse<typeof user> = {
        data: user,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// POST /api/users - Create a new user
fastify.post(
  '/api/users',
  {
    schema: {
      body: { $ref: 'createUserRequest#' },
      response: {
        201: {
          type: 'object',
          properties: {
            data: { $ref: 'user#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { username } = request.body as { username: string };
      const user = await userService.getOrCreateUser(username);
      const response: ApiResponse<typeof user> = {
        data: user,
        success: true,
      };
      return reply.status(201).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// List management endpoints

// GET /api/users/:userId/lists - Get all lists for a user
fastify.get(
  '/api/users/:userId/lists',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'integer', minimum: 1 },
        },
        required: ['userId'],
      },
      querystring: {
        type: 'object',
        properties: {
          includeTodoCount: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: 'todoList#' },
            },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { userId } = request.params as { userId: number };
      const { includeTodoCount } = request.query as {
        includeTodoCount?: boolean;
      };

      // Verify user exists
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const lists = await todoListService.getListsForUser(
        userId,
        includeTodoCount || false
      );
      const response: ApiResponse<typeof lists> = {
        data: lists,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// POST /api/users/:userId/lists - Create a new list for a user
fastify.post(
  '/api/users/:userId/lists',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'integer', minimum: 1 },
        },
        required: ['userId'],
      },
      body: { $ref: 'createTodoListRequest#' },
      response: {
        201: {
          type: 'object',
          properties: {
            data: { $ref: 'todoList#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { userId } = request.params as { userId: number };
      const { name } = request.body as CreateTodoListRequest;

      // Verify user exists
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const list = await todoListService.createList(userId, name);
      const response: ApiResponse<typeof list> = {
        data: list,
        success: true,
      };
      return reply.status(201).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// PUT /api/lists/:listId - Update list name
fastify.put(
  '/api/lists/:listId',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          listId: { type: 'integer', minimum: 1 },
        },
        required: ['listId'],
      },
      body: { $ref: 'updateTodoListRequest#' },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { $ref: 'todoList#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { listId } = request.params as { listId: number };
      const { name } = request.body as UpdateTodoListRequest;

      const list = await todoListService.updateListName(listId, name);
      const response: ApiResponse<typeof list> = {
        data: list,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// DELETE /api/lists/:listId - Delete a list
fastify.delete(
  '/api/lists/:listId',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          listId: { type: 'integer', minimum: 1 },
        },
        required: ['listId'],
      },
      response: {
        204: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
          },
          required: ['success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { listId } = request.params as { listId: number };

      await todoListService.deleteList(listId);
      const response = {
        success: true,
      };
      return reply.status(204).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// List-based todo endpoints

// GET /api/lists/:listId/todos - Get todos in a specific list
fastify.get(
  '/api/lists/:listId/todos',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          listId: { type: 'integer', minimum: 1 },
        },
        required: ['listId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: 'todo#' },
            },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { listId } = request.params as { listId: number };

      // Verify list exists
      const list = await todoListService.getListById(listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const todos = await todoService.getTodosInList(listId);
      const response: ApiResponse<typeof todos> = {
        data: todos,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// POST /api/lists/:listId/todos - Create a new todo in a specific list
fastify.post(
  '/api/lists/:listId/todos',
  {
    schema: {
      params: {
        type: 'object',
        properties: {
          listId: { type: 'integer', minimum: 1 },
        },
        required: ['listId'],
      },
      body: { $ref: 'createTodoRequest#' },
      response: {
        201: {
          type: 'object',
          properties: {
            data: { $ref: 'todo#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { listId } = request.params as { listId: number };
      const { text } = request.body as { text: string };

      // Verify list exists
      const list = await todoListService.getListById(listId);
      if (!list) {
        throw new Error(`List with ID ${listId} not found`);
      }

      const todo = await todoService.createTodoInList(listId, text);
      const response: ApiResponse<typeof todo> = {
        data: todo,
        success: true,
      };
      return reply.status(201).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// PUT /api/todos/:todoId/move - Move a todo to a different list
fastify.put(
  '/api/todos/:todoId/move',
  {
    preHandler: sessionMiddleware,
    schema: {
      params: {
        type: 'object',
        properties: {
          todoId: { type: 'integer', minimum: 1 },
        },
        required: ['todoId'],
      },
      body: { $ref: 'moveTodoRequest#' },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { $ref: 'todo#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { todoId } = request.params as { todoId: number };
      const { target_list_id } = request.body as MoveTodoRequest;

      // For now, we'll need to extract user ID from session middleware
      // This is a simplified approach - in a real app you'd have proper auth
      const username = extractUsername(request);
      const user = await userService.getUserByUsername(username);
      if (!user) {
        throw new Error('User not found');
      }

      const todo = await todoService.moveTodoToList(
        todoId,
        target_list_id,
        user.id
      );
      const response: ApiResponse<typeof todo> = {
        data: todo,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      throw error;
    }
  }
);

// Initialize services
const todoService = new TodoService();
const userService = new UserService();
const todoListService = new TodoListService();

// GET /api/todos - Retrieve all todos
fastify.get(
  '/api/todos',
  {
    preHandler: sessionMiddleware,
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: 'todo#' },
            },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const username = extractUsername(request);
      const todos = await todoService.getAllTodos(username);
      const response: ApiResponse<typeof todos> = {
        data: todos,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      // Let the global error handler deal with this
      throw error;
    }
  }
);

// POST /api/todos - Create a new todo
fastify.post(
  '/api/todos',
  {
    preHandler: sessionMiddleware,
    schema: {
      body: { $ref: 'createTodoRequest#' },
      response: {
        201: {
          type: 'object',
          properties: {
            data: { $ref: 'todo#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const username = extractUsername(request);
      const { text } = request.body as { text: string };
      const todo = await todoService.createTodo(username, { text });
      const response: ApiResponse<typeof todo> = {
        data: todo,
        success: true,
      };
      return reply.status(201).send(response);
    } catch (error) {
      // Let the global error handler deal with this
      throw error;
    }
  }
);

// PUT /api/todos/:id - Update todo completion status
fastify.put(
  '/api/todos/:id',
  {
    preHandler: sessionMiddleware,
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          completed: { type: 'boolean' },
        },
        required: ['completed'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { $ref: 'todo#' },
            success: { type: 'boolean', const: true },
          },
          required: ['data', 'success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const username = extractUsername(request);
      const { id } = request.params as { id: number };
      const { completed } = request.body as { completed: boolean };
      const legacyTodo = await todoService.updateTodo(username, id, {
        completed,
      });

      // Convert LegacyTodo to Todo format for response
      const todo: Todo = {
        id: legacyTodo.id,
        text: legacyTodo.text,
        completed: legacyTodo.completed,
        list_id: 0, // Default for legacy compatibility
        created_at: legacyTodo.createdAt,
      };

      const response: ApiResponse<typeof todo> = {
        data: todo,
        success: true,
      };
      return reply.status(200).send(response);
    } catch (error) {
      // Let the global error handler deal with this
      throw error;
    }
  }
);

// DELETE /api/todos/:id - Delete a todo
fastify.delete(
  '/api/todos/:id',
  {
    preHandler: sessionMiddleware,
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'integer', minimum: 1 },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
          },
          required: ['success'],
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const username = extractUsername(request);
      const { id } = request.params as { id: number };
      await todoService.deleteTodo(username, id);
      const response = {
        success: true,
      };
      return reply.status(204).send(response);
    } catch (error) {
      // Let the global error handler deal with this
      throw error;
    }
  }
);

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    await closeDatabase();
    await fastify.close();
    console.log('Server shut down successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const start = async () => {
  try {
    // Initialize database before starting server
    await initializeDatabase();

    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server is running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    await closeDatabase();
    process.exit(1);
  }
};

start();
