import { describe, it, expect, vi } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  sessionMiddleware,
  validateUsername,
  extractUsername,
  type SessionRequest,
} from './sessionMiddleware.js';

describe('sessionMiddleware', () => {
  describe('validateUsername', () => {
    it('should return null for undefined username', () => {
      expect(validateUsername(undefined)).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(validateUsername('')).toBe(null);
    });

    it('should return null for whitespace-only username', () => {
      expect(validateUsername('   ')).toBe(null);
      expect(validateUsername('\t\n')).toBe(null);
    });

    it('should return null for username longer than 50 characters', () => {
      const longUsername = 'a'.repeat(51);
      expect(validateUsername(longUsername)).toBe(null);
    });

    it('should return username for valid usernames', () => {
      expect(validateUsername('user')).toBe('user');
      expect(validateUsername('user123')).toBe('user123');
      expect(validateUsername('a')).toBe('a');
      expect(validateUsername('a'.repeat(50))).toBe('a'.repeat(50));
    });

    it('should return username with spaces if it contains non-whitespace', () => {
      expect(validateUsername('user name')).toBe('user name');
      expect(validateUsername(' user ')).toBe(' user ');
    });
  });

  describe('sessionMiddleware function', () => {
    const createMockRequest = (
      headers: Record<string, string | undefined> = {}
    ): FastifyRequest =>
      ({
        headers,
      }) as FastifyRequest;

    const createMockReply = () => {
      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;
      return reply;
    };

    it('should add username to request for valid username header', async () => {
      const request = createMockRequest({ 'x-username': 'testuser' });
      const reply = createMockReply();

      await sessionMiddleware(request, reply);

      expect((request as SessionRequest).username).toBe('testuser');
      expect(reply.status).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });

    it('should return 401 error for missing username header', async () => {
      const request = createMockRequest({});
      const reply = createMockReply();

      await sessionMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message:
            'Valid username is required. Username must be 1-50 non-whitespace characters.',
          details: {
            header: 'X-Username',
            received: null,
            validationRules: [
              'Must be 1-50 characters long',
              'Cannot be empty or only whitespace',
              'Must contain at least one non-whitespace character',
            ],
          },
        },
      });
    });

    it('should return 401 error for empty username header', async () => {
      const request = createMockRequest({ 'x-username': '' });
      const reply = createMockReply();

      await sessionMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message:
            'Valid username is required. Username must be 1-50 non-whitespace characters.',
          details: {
            header: 'X-Username',
            received: '',
            validationRules: [
              'Must be 1-50 characters long',
              'Cannot be empty or only whitespace',
              'Must contain at least one non-whitespace character',
            ],
          },
        },
      });
    });

    it('should return 401 error for whitespace-only username', async () => {
      const request = createMockRequest({ 'x-username': '   ' });
      const reply = createMockReply();

      await sessionMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message:
            'Valid username is required. Username must be 1-50 non-whitespace characters.',
          details: {
            header: 'X-Username',
            received: '   ',
            validationRules: [
              'Must be 1-50 characters long',
              'Cannot be empty or only whitespace',
              'Must contain at least one non-whitespace character',
            ],
          },
        },
      });
    });

    it('should return 401 error for username longer than 50 characters', async () => {
      const longUsername = 'a'.repeat(51);
      const request = createMockRequest({ 'x-username': longUsername });
      const reply = createMockReply();

      await sessionMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message:
            'Valid username is required. Username must be 1-50 non-whitespace characters.',
          details: {
            header: 'X-Username',
            received: longUsername,
            validationRules: [
              'Must be 1-50 characters long',
              'Cannot be empty or only whitespace',
              'Must contain at least one non-whitespace character',
            ],
          },
        },
      });
    });
  });

  describe('extractUsername', () => {
    it('should return username from authenticated request', () => {
      const request = { username: 'testuser' } as SessionRequest;
      expect(extractUsername(request)).toBe('testuser');
    });

    it('should throw error if username not found in request', () => {
      const request = {} as FastifyRequest;
      expect(() => extractUsername(request)).toThrow(
        'Username not found in request. Ensure session middleware is applied.'
      );
    });
  });
});
