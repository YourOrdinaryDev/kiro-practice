<template>
  <div class="list-selector">
    <header class="selector-header">
      <h2>Your Lists</h2>
      <div v-if="loading" class="loading-indicator">
        <span class="loading-spinner"></span>
        Loading lists...
      </div>
    </header>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button @click="$emit('reload')" class="retry-button">Try Again</button>
    </div>

    <!-- Lists display -->
    <div v-else-if="lists.length > 0" class="lists-container">
      <div
        v-for="list in lists"
        :key="list.id"
        class="list-item"
        :class="{ 'list-item--active': list.id === activeListId }"
        @click="handleListSelect(list.id)"
      >
        <div class="list-info">
          <h3 class="list-name">{{ list.name }}</h3>
          <span class="todo-count">
            {{ list.todo_count || 0 }}
            {{ (list.todo_count || 0) === 1 ? 'todo' : 'todos' }}
          </span>
        </div>
        <div v-if="list.id === activeListId" class="active-indicator">✓</div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="empty-state">
      <p class="empty-message">No lists found</p>
      <p class="empty-hint">Create your first list to get started</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TodoList } from '../types/todo.js';

// Props
interface Props {
  lists: TodoList[];
  activeListId: number | null;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

// Emits
const emit = defineEmits<{
  listSelect: [listId: number];
  reload: [];
}>();

/**
 * Handle list selection
 * Implements Requirements 5.2 - Handle list selection
 */
const handleListSelect = (listId: number): void => {
  if (listId !== props.activeListId) {
    emit('listSelect', listId);
  }
};
</script>

<style scoped>
.list-selector {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.selector-header {
  padding: 20px;
  border-bottom: 1px solid #e1e8ed;
  background: #f8f9fa;
}

.selector-header h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #e1e8ed;
  border-top: 2px solid #7f8c8d;
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

.error-state {
  padding: 20px;
  text-align: center;
}

.error-message {
  color: #e74c3c;
  margin: 0 0 15px 0;
  padding: 12px;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 0.9rem;
}

.retry-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2980b9;
}

.lists-container {
  max-height: 400px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e8ed;
  cursor: pointer;
  transition: background-color 0.2s;
}

.list-item:hover {
  background-color: #f8f9fa;
}

.list-item--active {
  background-color: #e3f2fd;
  border-left: 4px solid #2196f3;
}

.list-item--active:hover {
  background-color: #e3f2fd;
}

.list-item:last-child {
  border-bottom: none;
}

.list-info {
  flex: 1;
  min-width: 0;
}

.list-name {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-count {
  color: #7f8c8d;
  font-size: 0.85rem;
}

.active-indicator {
  color: #2196f3;
  font-weight: bold;
  font-size: 1.1rem;
  margin-left: 12px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.empty-message {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin: 0 0 8px 0;
}

.empty-hint {
  color: #95a5a6;
  font-size: 0.9rem;
  margin: 0;
}

/* Responsive design */
@media (max-width: 480px) {
  .selector-header {
    padding: 16px;
  }

  .list-item {
    padding: 14px 16px;
  }

  .list-name {
    font-size: 0.95rem;
  }

  .todo-count {
    font-size: 0.8rem;
  }
}
</style>
