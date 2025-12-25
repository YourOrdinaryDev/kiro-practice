import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ApiError } from '../types/todo.js';

export interface SessionRequest extends FastifyRequest {
  username: string;
}

/**
 * Validates username according to requirements:
 * - Must be 1-50 characters long
 * - Cannot be empty or only whitespace
 * - Must contain at least one non-whitespace character
 */
export function validateUsername(username: string | undefined): string | null {
  if (!username) {
    return null;
  }

  // Check if username is only whitespace
  if (username.trim().length === 0) {
    return null;
  }

  // Check length constraints (1-50 characters)
  if (username.length < 1 || username.length > 50) {
    return null;
  }

  return username;
}

/**
 * Session middleware that extracts and validates username from X-Username header
 * Adds username to request object for downstream handlers
 */
export async function sessionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const usernameHeader = request.headers['x-username'] as string | undefined;
  
  // Extract username from header
  const username = validateUsername(usernameHeader);
  
  if (!username) {
    const errorResponse: ApiError = {
      success: false,
      error: {
        code: 'INVALID_USERNAME',
        message: 'Valid username is required. Username must be 1-50 non-whitespace characters.',
        details: {
          header: 'X-Username',
          received: usernameHeader ?? null,
          validationRules: [
            'Must be 1-50 characters long',
            'Cannot be empty or only whitespace',
            'Must contain at least one non-whitespace character'
          ]
        }
      }
    };
    
    return reply.status(401).send(errorResponse);
  }
  
  // Add username to request object for downstream handlers
  (request as SessionRequest).username = username;
}

/**
 * Helper function to extract username from authenticated request
 */
export function extractUsername(request: FastifyRequest): string {
  const sessionRequest = request as SessionRequest;
  if (!sessionRequest.username) {
    throw new Error('Username not found in request. Ensure session middleware is applied.');
  }
  return sessionRequest.username;
}