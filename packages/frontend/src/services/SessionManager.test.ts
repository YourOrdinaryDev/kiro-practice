import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from './SessionManager';

// Mock sessionStorage for testing
const mockSessionStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockSessionStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage.store[key];
  }),
  clear: vi.fn(() => {
    mockSessionStorage.store = {};
  })
};

// Replace global sessionStorage with mock
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Clear mock storage before each test
    mockSessionStorage.clear();
    vi.clearAllMocks();
    sessionManager = new SessionManager();
  });

  describe('setUsername and getCurrentUsername', () => {
    it('should store and retrieve a valid username', () => {
      const username = 'testuser';
      
      sessionManager.setUsername(username);
      
      expect(sessionManager.getCurrentUsername()).toBe(username);
      expect(sessionManager.hasActiveSession()).toBe(true);
    });

    it('should reject empty username', () => {
      expect(() => sessionManager.setUsername('')).toThrow('Invalid username');
    });

    it('should reject whitespace-only username', () => {
      expect(() => sessionManager.setUsername('   ')).toThrow('Invalid username');
    });

    it('should reject username longer than 50 characters', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => sessionManager.setUsername(longUsername)).toThrow('Invalid username');
    });

    it('should accept username with exactly 50 characters', () => {
      const maxUsername = 'a'.repeat(50);
      
      sessionManager.setUsername(maxUsername);
      
      expect(sessionManager.getCurrentUsername()).toBe(maxUsername);
    });

    it('should accept username with 1 character', () => {
      const minUsername = 'a';
      
      sessionManager.setUsername(minUsername);
      
      expect(sessionManager.getCurrentUsername()).toBe(minUsername);
    });
  });

  describe('clearSession', () => {
    it('should clear the session data', () => {
      sessionManager.setUsername('testuser');
      expect(sessionManager.hasActiveSession()).toBe(true);
      
      sessionManager.clearSession();
      
      expect(sessionManager.getCurrentUsername()).toBe(null);
      expect(sessionManager.hasActiveSession()).toBe(false);
    });
  });

  describe('hasActiveSession', () => {
    it('should return false when no session exists', () => {
      expect(sessionManager.hasActiveSession()).toBe(false);
    });

    it('should return true when session exists', () => {
      sessionManager.setUsername('testuser');
      expect(sessionManager.hasActiveSession()).toBe(true);
    });
  });

  describe('session expiry', () => {
    it('should return null for expired session', () => {
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      const startTime = 1000000;
      
      // Set initial time
      vi.spyOn(Date, 'now').mockReturnValue(startTime);
      sessionManager.setUsername('testuser');
      
      // Simulate 25 hours later (session should expire after 24 hours)
      const expiredTime = startTime + (25 * 60 * 60 * 1000);
      vi.spyOn(Date, 'now').mockReturnValue(expiredTime);
      
      expect(sessionManager.getCurrentUsername()).toBe(null);
      expect(sessionManager.hasActiveSession()).toBe(false);
      
      // Restore original Date.now
      Date.now = originalNow;
    });

    it('should extend session on access', () => {
      const originalNow = Date.now;
      const startTime = 1000000;
      
      // Set initial time
      vi.spyOn(Date, 'now').mockReturnValue(startTime);
      sessionManager.setUsername('testuser');
      
      // Simulate 1 hour later (within session timeout)
      const laterTime = startTime + (1 * 60 * 60 * 1000);
      vi.spyOn(Date, 'now').mockReturnValue(laterTime);
      
      // Access should extend the session
      expect(sessionManager.getCurrentUsername()).toBe('testuser');
      
      // Verify timestamp was updated
      expect(sessionManager.getSessionTimestamp()).toBe(laterTime);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('getSessionTimestamp', () => {
    it('should return null when no session exists', () => {
      expect(sessionManager.getSessionTimestamp()).toBe(null);
    });

    it('should return timestamp when session exists', () => {
      const originalNow = Date.now;
      const testTime = 1234567890;
      
      vi.spyOn(Date, 'now').mockReturnValue(testTime);
      sessionManager.setUsername('testuser');
      
      expect(sessionManager.getSessionTimestamp()).toBe(testTime);
      
      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});