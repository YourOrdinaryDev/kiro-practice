<template>
  <div class="todo-item" :class="{ 'todo-completed': todo.completed }">
    <div class="todo-content">
      <!-- Checkbox for completion toggle -->
      <button
        class="todo-checkbox"
        :class="{ 'checkbox-checked': todo.completed }"
        @click="handleToggle"
        :aria-label="todo.completed ? 'Mark as incomplete' : 'Mark as complete'"
      >
        <svg
          v-if="todo.completed"
          class="check-icon"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <!-- Todo text and metadata -->
      <div class="todo-details">
        <p class="todo-text" :class="{ 'text-completed': todo.completed }">
          {{ todo.text }}
        </p>
        <div class="todo-metadata">
          <span class="todo-date">
            {{ todo.completed ? 'Completed' : 'Created' }} 
            {{ formatDate(todo.created_at) }}
          </span>
          <span v-if="todo.completed" class="completion-badge">
            ✓ Done
          </span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="todo-actions">
      <button
        class="action-button toggle-button"
        @click="handleToggle"
        :title="todo.completed ? 'Mark as incomplete' : 'Mark as complete'"
      >
        {{ todo.completed ? '↶' : '✓' }}
      </button>
      
      <button
        class="action-button delete-button"
        @click="handleDelete"
        title="Delete todo"
      >
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '../types/todo.js';

// Props
interface Props {
  todo: Todo;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  toggle: [id: number];
  delete: [id: number];
}

const emit = defineEmits<Emits>();

/**
 * Handle toggle completion status
 * Implements Requirements 3.1 - Toggle completion status
 */
const handleToggle = (): void => {
  emit('toggle', props.todo.id);
};

/**
 * Handle delete todo
 * Implements Requirements 4.1 - Delete todos
 */
const handleDelete = (): void => {
  emit('delete', props.todo.id);
};

/**
 * Format date for display
 * Implements Requirements 2.2 - Display creation timestamp
 */
const formatDate = (date: Date | undefined): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'unknown';
  }
  
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInHours < 48) {
    return 'yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f3f4;
  transition: background-color 0.2s, opacity 0.2s;
  background-color: white;
}

.todo-item:hover {
  background-color: #fafbfc;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-completed {
  opacity: 0.7;
}

.todo-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0; /* Allow text to truncate */
}

.todo-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}

.todo-checkbox:hover {
  border-color: #3498db;
}

.checkbox-checked {
  background-color: #27ae60;
  border-color: #27ae60;
  color: white;
}

.check-icon {
  width: 12px;
  height: 12px;
}

.todo-details {
  flex: 1;
  min-width: 0;
}

.todo-text {
  margin: 0 0 4px 0;
  font-size: 1rem;
  line-height: 1.4;
  color: #2c3e50;
  word-wrap: break-word;
  transition: color 0.2s;
}

.text-completed {
  text-decoration: line-through;
  color: #7f8c8d;
}

.todo-metadata {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.todo-date {
  font-size: 0.75rem;
  color: #95a5a6;
}

.completion-badge {
  font-size: 0.7rem;
  background-color: #d5f4e6;
  color: #27ae60;
  padding: 2px 6px;
  border-radius: 12px;
  font-weight: 500;
}

.todo-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.todo-item:hover .todo-actions {
  opacity: 1;
}

.action-button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s;
  background-color: transparent;
}

.toggle-button {
  color: #3498db;
}

.toggle-button:hover {
  background-color: #e3f2fd;
  color: #2980b9;
}

.delete-button {
  color: #e74c3c;
}

.delete-button:hover {
  background-color: #fdf2f2;
  color: #c0392b;
}

/* Always show actions on mobile */
@media (max-width: 768px) {
  .todo-actions {
    opacity: 1;
  }
  
  .todo-item {
    padding: 12px 20px;
  }
  
  .action-button {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .todo-text {
    font-size: 0.95rem;
  }
}

/* Focus styles for accessibility */
.todo-checkbox:focus,
.action-button:focus {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}
</style>