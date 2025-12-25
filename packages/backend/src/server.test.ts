import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { initializeDatabase, closeDatabase } from './database/index.js';
import { TodoService } from './services/TodoService.js';
import {
  sessionMiddleware,
  extractUsername,
} from './middleware/sessionMiddleware.js';
import type { ApiResponse, ApiError } from './types/todo.js';

// Create a test server instance
const createTestServer = async () => {
  const fastify = Fastify({
    logger: false, // Disable logging for tests
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

  // Global error handler
  fastify.setErrorHandler(async (error, request, reply) => {
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

  // Initialize TodoService
  const todoService = new TodoService();

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
        body: { $ref: 'updateTodoRequest#' },
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
        const todo = await todoService.updateTodo(username, id, { completed });
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

  return fastify;
};

describe('Server API Endpoints', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    await initializeDatabase();
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.close();
    await closeDatabase();
  });

  describe('POST /api/todos', () => {
    it('should create a new todo with valid text', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          text: 'Test todo item',
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.body) as ApiResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        text: 'Test todo item',
        completed: false,
      });
      expect(body.data.id).toBeTypeOf('number');
      expect(body.data.createdAt).toBeTypeOf('string');
      expect(body.data.updatedAt).toBeTypeOf('string');
    });

    it('should reject empty text', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          text: '',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject whitespace-only text', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          text: '   ',
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing text field', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject text longer than 500 characters', async () => {
      const longText = 'a'.repeat(501);
      const response = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          text: longText,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/todos/:id', () => {
    it('should update todo completion status', async () => {
      // First create a todo
      const createResponse = await server.inject({
        method: 'POST',
        url: '/api/todos',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          text: 'Test todo for update',
        },
      });

      const createdTodo = JSON.parse(createResponse.body).data;

      // Then update it
      const updateResponse = await server.inject({
        method: 'PUT',
        url: `/api/todos/${createdTodo.id}`,
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          completed: true,
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      const body = JSON.parse(updateResponse.body) as ApiResponse<any>;
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        id: createdTodo.id,
        text: 'Test todo for update',
        completed: true,
      });
    });

    it('should reject invalid todo ID', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/todos/invalid',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          completed: true,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-existent todo ID', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/todos/99999',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {
          completed: true,
        },
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing completed field', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/todos/1',
        headers: {
          'X-Username': 'testuser',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body) as ApiError;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
