<template>
  <div class="todo-app">
    <header class="app-header">
      <h1>Todo Management</h1>
    </header>

    <main class="app-main">
      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <p>Loading todos...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="error-state">
        <p class="error-message">{{ error }}</p>
        <button @click="loadTodos" class="retry-button">
          Try Again
        </button>
      </div>

      <!-- Main content -->
      <div v-else class="app-content">
        <TodoForm @submit="handleCreateTodo" :submitting="submitting" />
        <TodoList 
          :todos="todos" 
          @toggle="handleToggleTodo" 
          @delete="handleDeleteTodo" 
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { todoApiClient } from '../api/TodoApiClient.js';
import type { Todo } from '../types/todo.js';
import TodoForm from './TodoForm.vue';
import TodoList from './TodoList.vue';

// Reactive state management
const todos = ref<Todo[]>([]);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const submitting = ref<boolean>(false);

/**
 * Load all todos from the backend
 * Implements Requirements 2.3, 7.3 - Display todos with error handling
 */
const loadTodos = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  
  try {
    todos.value = await todoApiClient.getTodos();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load todos';
    console.error('Error loading todos:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Handle creating a new todo
 * Implements Requirements 1.1, 1.2 - Create todos with validation
 */
const handleCreateTodo = async (text: string): Promise<void> => {
  submitting.value = true;
  error.value = null;
  
  try {
    const newTodo = await todoApiClient.createTodo(text);
    todos.value.push(newTodo);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create todo';
    console.error('Error creating todo:', err);
  } finally {
    submitting.value = false;
  }
};

/**
 * Handle toggling todo completion status
 * Implements Requirements 3.1 - Toggle completion status
 */
const handleToggleTodo = async (id: number): Promise<void> => {
  const todo = todos.value.find(t => t.id === id);
  if (!todo) return;
  
  try {
    const updatedTodo = await todoApiClient.updateTodo(id, !todo.completed);
    const index = todos.value.findIndex(t => t.id === id);
    if (index !== -1) {
      todos.value[index] = updatedTodo;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update todo';
    console.error('Error updating todo:', err);
  }
};

/**
 * Handle deleting a todo
 * Implements Requirements 4.1 - Delete todos
 */
const handleDeleteTodo = async (id: number): Promise<void> => {
  try {
    await todoApiClient.deleteTodo(id);
    todos.value = todos.value.filter(t => t.id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete todo';
    console.error('Error deleting todo:', err);
  }
};

// Load todos when component mounts
onMounted(() => {
  loadTodos();
});
</script>

<style scoped>
.todo-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 30px;
}

.app-header h1 {
  color: #2c3e50;
  font-size: 2.5rem;
  margin: 0;
  font-weight: 300;
}

.app-main {
  min-height: 400px;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
}

.loading-state p {
  color: #7f8c8d;
  font-size: 1.1rem;
  margin: 0;
}

.error-state {
  text-align: center;
  padding: 40px 20px;
}

.error-message {
  color: #e74c3c;
  font-size: 1.1rem;
  margin: 0 0 20px 0;
  padding: 15px;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.retry-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2980b9;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
</style>