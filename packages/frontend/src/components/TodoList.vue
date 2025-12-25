<template>
  <div class="todo-list">
    <!-- Empty state -->
    <div v-if="todos.length === 0" class="empty-state">
      <div class="empty-icon">📝</div>
      <h3 class="empty-title">No todos yet</h3>
      <p class="empty-description">
        Add your first todo above to get started organizing your tasks!
      </p>
    </div>

    <!-- Todo list -->
    <div v-else class="todo-container">
      <!-- Summary -->
      <div class="todo-summary">
        <p class="summary-text">
          {{ completedCount }} of {{ todos.length }} 
          {{ todos.length === 1 ? 'task' : 'tasks' }} completed
        </p>
      </div>

      <!-- Todos grouped by completion status -->
      <div class="todo-sections">
        <!-- Incomplete todos -->
        <div v-if="incompleteTodos.length > 0" class="todo-section">
          <h4 class="section-title">
            Pending Tasks ({{ incompleteTodos.length }})
          </h4>
          <div class="todo-items">
            <TodoItem
              v-for="todo in incompleteTodos"
              :key="todo.id"
              :todo="todo"
              @toggle="handleToggle"
              @delete="handleDelete"
            />
          </div>
        </div>

        <!-- Completed todos -->
        <div v-if="completedTodos.length > 0" class="todo-section completed-section">
          <h4 class="section-title">
            Completed Tasks ({{ completedTodos.length }})
          </h4>
          <div class="todo-items">
            <TodoItem
              v-for="todo in completedTodos"
              :key="todo.id"
              :todo="todo"
              @toggle="handleToggle"
              @delete="handleDelete"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Todo } from '../types/todo.js';
import TodoItem from './TodoItem.vue';

// Props
interface Props {
  todos: Todo[];
}

const props = defineProps<Props>();

// Emits
interface Emits {
  toggle: [id: number];
  delete: [id: number];
}

const emit = defineEmits<Emits>();

/**
 * Computed property for incomplete todos
 * Implements Requirements 2.4 - Order todos with incomplete first
 */
const incompleteTodos = computed((): Todo[] => {
  return props.todos
    .filter(todo => !todo.completed)
    .sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
      const dateB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
});

/**
 * Computed property for completed todos
 * Implements Requirements 2.4 - Order todos with completed last
 */
const completedTodos = computed((): Todo[] => {
  return props.todos
    .filter(todo => todo.completed)
    .sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
      const dateB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
});

/**
 * Computed property for completion count
 * Implements Requirements 2.1, 2.2 - Display completion status
 */
const completedCount = computed((): number => {
  return props.todos.filter(todo => todo.completed).length;
});

/**
 * Handle toggle todo completion
 * Implements Requirements 3.1 - Toggle completion status
 */
const handleToggle = (id: number): void => {
  emit('toggle', id);
};

/**
 * Handle delete todo
 * Implements Requirements 4.1 - Delete todos
 */
const handleDelete = (id: number): void => {
  emit('delete', id);
};
</script>

<style scoped>
.todo-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e1e5e9;
  overflow: hidden;
}

/* Empty state styles */
.empty-state {
  text-align: center;
  padding: 60px 40px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0 0 12px 0;
  color: #5a6c7d;
}

.empty-description {
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

/* Todo container styles */
.todo-container {
  padding: 0;
}

.todo-summary {
  padding: 20px 24px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e1e5e9;
}

.summary-text {
  margin: 0;
  font-size: 0.95rem;
  color: #6c757d;
  font-weight: 500;
}

.todo-sections {
  padding: 0;
}

.todo-section {
  border-bottom: 1px solid #f1f3f4;
}

.todo-section:last-child {
  border-bottom: none;
}

.section-title {
  margin: 0;
  padding: 16px 24px 12px 24px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #fafbfc;
  border-bottom: 1px solid #e9ecef;
}

.completed-section .section-title {
  color: #6c757d;
}

.todo-items {
  padding: 0;
}

/* Responsive design */
@media (max-width: 480px) {
  .empty-state {
    padding: 40px 20px;
  }
  
  .empty-icon {
    font-size: 3rem;
  }
  
  .empty-title {
    font-size: 1.25rem;
  }
  
  .todo-summary {
    padding: 16px 20px;
  }
  
  .section-title {
    padding: 12px 20px 8px 20px;
    font-size: 0.85rem;
  }
}
</style>