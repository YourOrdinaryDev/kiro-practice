<template>
  <div id="app">
    <!-- Session-based routing: Show UsernameEntry if no active session -->
    <UsernameEntry 
      v-if="!hasActiveSession" 
      @username-submit="handleUsernameSubmit"
      :error="sessionError"
    />
    
    <!-- Show main app with session controls if user is logged in -->
    <div v-else class="app-with-session">
      <!-- Session header with username display and logout -->
      <header class="session-header">
        <div class="session-info">
          <span class="welcome-text">Welcome back,</span>
          <span class="current-username">{{ currentUsername }}</span>
        </div>
        <button 
          @click="handleLogout" 
          class="logout-button"
          title="End session and return to login"
        >
          End Session
        </button>
      </header>
      
      <!-- Main todo application -->
      <TodoApp />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import TodoApp from './components/TodoApp.vue';
import UsernameEntry from './components/UsernameEntry.vue';
import { sessionManager } from './services/SessionManager.js';
import { todoApiClient } from './api/TodoApiClient.js';

// Reactive state
const currentUsername = ref<string | null>(null);
const sessionError = ref<string | null>(null);

// Computed properties
const hasActiveSession = computed(() => {
  return currentUsername.value !== null;
});

/**
 * Handle username submission from UsernameEntry component
 * Implements Requirements 1.2, 1.3 - Session establishment and navigation
 */
const handleUsernameSubmit = (username: string): void => {
  try {
    // Clear any previous errors
    sessionError.value = null;
    
    // Set the username in session manager (already done in UsernameEntry, but ensure consistency)
    sessionManager.setUsername(username);
    
    // Configure API client with username
    todoApiClient.setUsername(username);
    
    // Update current username state
    currentUsername.value = username;
    
    console.log(`Session established for user: ${username}`);
  } catch (error) {
    sessionError.value = error instanceof Error ? error.message : 'Failed to establish session';
    console.error('Session establishment error:', error);
  }
};

/**
 * Handle session termination
 * Implements Requirements 4.1, 4.2 - Session management and cleanup
 */
const handleLogout = (): void => {
  try {
    // Clear session data
    sessionManager.clearSession();
    
    // Clear API client username
    todoApiClient.clearUsername();
    
    // Update state
    currentUsername.value = null;
    sessionError.value = null;
    
    console.log('Session terminated successfully');
  } catch (error) {
    console.error('Error during logout:', error);
    // Even if there's an error, we should still clear the local state
    currentUsername.value = null;
    sessionError.value = null;
  }
};

/**
 * Initialize session state on app mount
 * Implements Requirements 1.5 - Session persistence across page refresh
 */
const initializeSession = (): void => {
  try {
    const existingUsername = sessionManager.getCurrentUsername();
    
    if (existingUsername) {
      // Restore session
      currentUsername.value = existingUsername;
      todoApiClient.setUsername(existingUsername);
      console.log(`Session restored for user: ${existingUsername}`);
    } else {
      // No active session
      currentUsername.value = null;
      todoApiClient.clearUsername();
    }
  } catch (error) {
    console.error('Error initializing session:', error);
    // If there's an error, treat as no session
    currentUsername.value = null;
    sessionError.value = 'Failed to restore session';
  }
};

// Initialize session when app mounts
onMounted(() => {
  initializeSession();
});
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 0;
}

/* App with session layout */
.app-with-session {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Session header styles */
.session-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
}

.welcome-text {
  opacity: 0.9;
  font-weight: 400;
}

.current-username {
  font-weight: 600;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.logout-button {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.logout-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.logout-button:active {
  transform: translateY(0);
}

/* Main content area */
.app-with-session > :last-child {
  flex: 1;
  padding: 20px 0;
}

/* Global styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f8f9fa;
}

/* Responsive design */
@media (max-width: 768px) {
  .session-header {
    padding: 10px 15px;
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .session-info {
    flex-direction: column;
    gap: 4px;
  }
  
  .welcome-text {
    font-size: 0.85rem;
  }
  
  .current-username {
    font-size: 0.9rem;
  }
  
  .logout-button {
    font-size: 0.85rem;
    padding: 6px 12px;
  }
}

@media (max-width: 480px) {
  .session-header {
    padding: 8px 10px;
  }
  
  .current-username {
    padding: 3px 8px;
    font-size: 0.85rem;
  }
}
</style>