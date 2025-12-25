/**
 * SessionManager handles user session state and username persistence
 * using browser sessionStorage for temporary session management.
 */
export class SessionManager {
  private static readonly USERNAME_KEY = 'todo-app-username';
  private static readonly SESSION_TIMESTAMP_KEY = 'todo-app-session-timestamp';

  /**
   * Get the current username from session storage
   * @returns The current username or null if no active session
   */
  getCurrentUsername(): string | null {
    try {
      const username = sessionStorage.getItem(SessionManager.USERNAME_KEY);
      const timestamp = sessionStorage.getItem(
        SessionManager.SESSION_TIMESTAMP_KEY
      );

      // If no username or timestamp, no active session
      if (!username || !timestamp) {
        return null;
      }

      // Validate that the session is still valid (not expired)
      const sessionTime = parseInt(timestamp, 10);
      const now = Date.now();

      // Session expires after 24 hours of inactivity
      const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (now - sessionTime > SESSION_TIMEOUT) {
        this.clearSession();
        return null;
      }

      // Update timestamp to extend session
      sessionStorage.setItem(
        SessionManager.SESSION_TIMESTAMP_KEY,
        now.toString()
      );

      return username;
    } catch (error) {
      // Handle cases where sessionStorage is not available
      console.warn('SessionStorage not available:', error);
      return null;
    }
  }

  /**
   * Set the username and establish a session
   * @param username The username to set for the current session
   * @throws Error if username is invalid
   */
  setUsername(username: string): void {
    // Validate username according to requirements
    if (!this.isValidUsername(username)) {
      throw new Error(
        'Invalid username: must be 1-50 non-whitespace characters'
      );
    }

    try {
      const now = Date.now();
      sessionStorage.setItem(SessionManager.USERNAME_KEY, username);
      sessionStorage.setItem(
        SessionManager.SESSION_TIMESTAMP_KEY,
        now.toString()
      );
    } catch (error) {
      throw new Error('Failed to store session data: ' + error);
    }
  }

  /**
   * Clear the current session and remove all session data
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SessionManager.USERNAME_KEY);
      sessionStorage.removeItem(SessionManager.SESSION_TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  }

  /**
   * Check if there is an active session
   * @returns true if there is an active session, false otherwise
   */
  hasActiveSession(): boolean {
    return this.getCurrentUsername() !== null;
  }

  /**
   * Validate username according to requirements:
   * - Must be 1-50 characters long
   * - Must not be empty or only whitespace
   * @param username The username to validate
   * @returns true if username is valid, false otherwise
   */
  private isValidUsername(username: string): boolean {
    if (!username || typeof username !== 'string') {
      return false;
    }

    // Check if username is only whitespace
    if (username.trim().length === 0) {
      return false;
    }

    // Check length constraints (1-50 characters)
    if (username.length < 1 || username.length > 50) {
      return false;
    }

    return true;
  }

  /**
   * Get session establishment timestamp
   * @returns The timestamp when the session was established, or null if no session
   */
  getSessionTimestamp(): number | null {
    try {
      const timestamp = sessionStorage.getItem(
        SessionManager.SESSION_TIMESTAMP_KEY
      );
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      return null;
    }
  }
}

// Export a singleton instance for use throughout the application
export const sessionManager = new SessionManager();
