import Fastify from 'fastify';
import { initializeDatabase, closeDatabase } from './database/index.js';
import { TodoService } from './services/TodoService.js';
import { sessionMiddleware, extractUsername } from './middleware/sessionMiddleware.js';
import type { ApiError, ApiResponse } from './types/todo.js';

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
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'text', 'completed', 'createdAt', 'updatedAt'],
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
  if (error.message && error.message.includes('Username not found in request')) {
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
  if (error.message && (
    error.message.includes('cannot be empty') ||
    error.message.includes('whitespace') ||
    error.message.includes('is required') ||
    error.message.includes('cannot exceed') ||
    error.message.includes('not found')
  )) {
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

// Initialize TodoService
const todoService = new TodoService();

// GET /api/todos - Retrieve all todos
fastify.get('/api/todos', {
  preHandler: sessionMiddleware,
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: 'todo#' }
          },
          success: { type: 'boolean', const: true }
        },
        required: ['data', 'success']
      }
    }
  }
}, async (request, reply) => {
  try {
    const username = extractUsername(request);
    const todos = await todoService.getAllTodos(username);
    const response: ApiResponse<typeof todos> = {
      data: todos,
      success: true
    };
    return reply.status(200).send(response);
  } catch (error) {
    // Let the global error handler deal with this
    throw error;
  }
});

// POST /api/todos - Create a new todo
fastify.post('/api/todos', {
  preHandler: sessionMiddleware,
  schema: {
    body: { $ref: 'createTodoRequest#' },
    response: {
      201: {
        type: 'object',
        properties: {
          data: { $ref: 'todo#' },
          success: { type: 'boolean', const: true }
        },
        required: ['data', 'success']
      }
    }
  }
}, async (request, reply) => {
  try {
    const username = extractUsername(request);
    const { text } = request.body as { text: string };
    const todo = await todoService.createTodo(username, { text });
    const response: ApiResponse<typeof todo> = {
      data: todo,
      success: true
    };
    return reply.status(201).send(response);
  } catch (error) {
    // Let the global error handler deal with this
    throw error;
  }
});

// PUT /api/todos/:id - Update todo completion status
fastify.put('/api/todos/:id', {
  preHandler: sessionMiddleware,
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', minimum: 1 }
      },
      required: ['id']
    },
    body: { $ref: 'updateTodoRequest#' },
    response: {
      200: {
        type: 'object',
        properties: {
          data: { $ref: 'todo#' },
          success: { type: 'boolean', const: true }
        },
        required: ['data', 'success']
      }
    }
  }
}, async (request, reply) => {
  try {
    const username = extractUsername(request);
    const { id } = request.params as { id: number };
    const { completed } = request.body as { completed: boolean };
    const todo = await todoService.updateTodo(username, id, { completed });
    const response: ApiResponse<typeof todo> = {
      data: todo,
      success: true
    };
    return reply.status(200).send(response);
  } catch (error) {
    // Let the global error handler deal with this
    throw error;
  }
});

// DELETE /api/todos/:id - Delete a todo
fastify.delete('/api/todos/:id', {
  preHandler: sessionMiddleware,
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer', minimum: 1 }
      },
      required: ['id']
    },
    response: {
      204: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: true }
        },
        required: ['success']
      }
    }
  }
}, async (request, reply) => {
  try {
    const username = extractUsername(request);
    const { id } = request.params as { id: number };
    await todoService.deleteTodo(username, id);
    const response = {
      success: true
    };
    return reply.status(204).send(response);
  } catch (error) {
    // Let the global error handler deal with this
    throw error;
  }
});

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