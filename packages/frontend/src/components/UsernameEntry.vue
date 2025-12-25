<template>
  <div class="username-entry">
    <div class="username-entry-container">
      <header class="entry-header">
        <h1>Welcome to Todo App</h1>
        <p class="entry-subtitle">
          Enter your username to access your personal todo list
        </p>
      </header>

      <form @submit.prevent="handleSubmit" class="username-form">
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': hasError }"
            placeholder="Enter your username (1-50 characters)"
            maxlength="50"
            autocomplete="username"
            :disabled="submitting"
            @input="clearError"
          />
          <div v-if="hasError" class="form-error">
            {{ errorMessage }}
          </div>
          <div class="form-hint">
            Username must be 1-50 characters and cannot be empty or only spaces
          </div>
        </div>

        <button
          type="submit"
          class="submit-button"
          :class="{ 'submit-button--loading': submitting }"
          :disabled="submitting || !username.trim()"
        >
          <span v-if="submitting" class="loading-spinner"></span>
          {{ submitting ? 'Starting Session...' : 'Start Session' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { sessionManager } from '../services/SessionManager.js';

// Props
interface Props {
  onUsernameSubmit?: (username: string) => void;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  onUsernameSubmit: undefined,
  error: undefined,
});

// Emits
const emit = defineEmits<{
  usernameSubmit: [username: string];
  error: [error: string];
}>();

// Reactive state
const username = ref<string>('');
const submitting = ref<boolean>(false);
const validationError = ref<string | null>(null);

// Computed properties
const errorMessage = computed(() => {
  return props.error || validationError.value || '';
});

const hasError = computed(() => {
  return !!(props.error || validationError.value);
});

/**
 * Validate username according to requirements 2.1, 2.2, 2.3
 * @param usernameValue The username to validate
 * @returns Validation error message or null if valid
 */
const validateUsername = (usernameValue: string): string | null => {
  // Requirement 2.1: Empty username should be rejected
  if (!usernameValue) {
    return 'Username cannot be empty';
  }

  // Requirement 2.2: Username with only whitespace should be rejected
  if (usernameValue.trim().length === 0) {
    return 'Username cannot contain only spaces';
  }

  // Requirement 2.3: Username longer than 50 characters should be rejected
  if (usernameValue.length > 50) {
    return 'Username must be 50 characters or less';
  }

  // Additional validation: Username must be at least 1 character after trimming
  if (usernameValue.trim().length < 1) {
    return 'Username must contain at least one non-space character';
  }

  return null;
};

/**
 * Clear any existing validation errors
 */
const clearError = (): void => {
  validationError.value = null;
};

/**
 * Handle form submission
 * Implements requirements 1.2, 2.4 - Session establishment with validation
 */
const handleSubmit = async (): Promise<void> => {
  const trimmedUsername = username.value.trim();

  // Clear any previous errors
  validationError.value = null;

  // Validate username
  const validationResult = validateUsername(username.value);
  if (validationResult) {
    validationError.value = validationResult;
    return;
  }

  submitting.value = true;

  try {
    // Use SessionManager to establish session
    sessionManager.setUsername(trimmedUsername);

    // Emit success event
    emit('usernameSubmit', trimmedUsername);

    // Call prop callback if provided
    if (props.onUsernameSubmit) {
      props.onUsernameSubmit(trimmedUsername);
    }
  } catch (error) {
    // Handle session creation errors
    const errorMsg =
      error instanceof Error ? error.message : 'Failed to create session';
    validationError.value = errorMsg;
    emit('error', errorMsg);
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.username-entry {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.username-entry-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.entry-header {
  text-align: center;
  margin-bottom: 30px;
}

.entry-header h1 {
  color: #2c3e50;
  font-size: 2rem;
  margin: 0 0 10px 0;
  font-weight: 600;
}

.entry-subtitle {
  color: #7f8c8d;
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
}

.username-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: #2c3e50;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input--error {
  border-color: #e74c3c;
}

.form-input--error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}

.form-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-error {
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-error::before {
  content: '⚠';
  font-size: 0.9rem;
}

.form-hint {
  color: #95a5a6;
  font-size: 0.8rem;
  line-height: 1.4;
}

.submit-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.submit-button--loading {
  cursor: wait;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive design */
@media (max-width: 480px) {
  .username-entry {
    padding: 10px;
  }

  .username-entry-container {
    padding: 30px 20px;
  }

  .entry-header h1 {
    font-size: 1.75rem;
  }
}
</style>
