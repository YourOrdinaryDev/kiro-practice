<template>
  <form @submit.prevent="handleSubmit" class="todo-form">
    <div class="form-group">
      <label for="todo-input" class="form-label">
        Add a new todo
      </label>
      <div class="input-group">
        <input
          id="todo-input"
          ref="inputRef"
          v-model="text"
          type="text"
          class="todo-input"
          :class="{ 'input-error': validationError }"
          placeholder="What needs to be done?"
          :disabled="submitting"
          maxlength="500"
          @input="clearValidationError"
        />
        <button
          type="submit"
          class="submit-button"
          :disabled="submitting || !isValidInput"
        >
          {{ submitting ? 'Adding...' : 'Add Todo' }}
        </button>
      </div>
      
      <!-- Validation error message -->
      <div v-if="validationError" class="validation-error">
        {{ validationError }}
      </div>
      
      <!-- Character count -->
      <div class="character-count" :class="{ 'count-warning': text.length > 450 }">
        {{ text.length }}/500 characters
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

// Props
interface Props {
  submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  submitting: false,
});

// Emits
interface Emits {
  submit: [text: string];
}

const emit = defineEmits<Emits>();

// Reactive state
const text = ref<string>('');
const validationError = ref<string>('');
const inputRef = ref<HTMLInputElement>();

/**
 * Computed property to check if input is valid
 * Implements Requirements 1.2 - Input validation
 */
const isValidInput = computed((): boolean => {
  const trimmedText = text.value.trim();
  return trimmedText.length > 0 && trimmedText.length <= 500;
});

/**
 * Validate the input text
 * Implements Requirements 1.2 - Client-side validation
 */
const validateInput = (): boolean => {
  const trimmedText = text.value.trim();
  
  if (trimmedText.length === 0) {
    validationError.value = 'Todo description cannot be empty';
    return false;
  }
  
  if (trimmedText.length > 500) {
    validationError.value = 'Todo description cannot exceed 500 characters';
    return false;
  }
  
  validationError.value = '';
  return true;
};

/**
 * Clear validation error when user starts typing
 */
const clearValidationError = (): void => {
  if (validationError.value) {
    validationError.value = '';
  }
};

/**
 * Handle form submission
 * Implements Requirements 1.1, 1.2 - Create todos with validation
 */
const handleSubmit = async (): Promise<void> => {
  if (!validateInput()) {
    return;
  }
  
  const trimmedText = text.value.trim();
  
  try {
    // Emit the submit event to parent component
    emit('submit', trimmedText);
    
    // Clear the form after successful submission
    text.value = '';
    validationError.value = '';
    
    // Focus the input field for next entry
    await nextTick();
    inputRef.value?.focus();
  } catch (error) {
    console.error('Error in form submission:', error);
  }
};
</script>

<style scoped>
.todo-form {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e5e9;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.input-group {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.todo-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

.todo-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.todo-input:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.todo-input.input-error {
  border-color: #e74c3c;
}

.todo-input.input-error:focus {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}

.submit-button {
  padding: 12px 24px;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  white-space: nowrap;
}

.submit-button:hover:not(:disabled) {
  background-color: #229954;
  transform: translateY(-1px);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
  transform: none;
}

.validation-error {
  color: #e74c3c;
  font-size: 0.875rem;
  padding: 8px 12px;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  margin-top: 4px;
}

.character-count {
  font-size: 0.75rem;
  color: #7f8c8d;
  text-align: right;
  margin-top: 4px;
}

.character-count.count-warning {
  color: #f39c12;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 480px) {
  .input-group {
    flex-direction: column;
  }
  
  .submit-button {
    width: 100%;
  }
}
</style>