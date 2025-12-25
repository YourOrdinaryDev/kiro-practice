<template>
  <div class="todo-app">
    <!-- Main app content -->
    <div class="authenticated-app">

      <main class="app-main">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <p>Loading your data...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <p class="error-message">{{ error }}</p>
          <button @click="loadUserData" class="retry-button">
            Try Again
          </button>
        </div>

        <!-- Main content -->
        <div v-else class="app-content">
          <div class="sidebar">
            <ListSelector
              :lists="todoLists"
              :active-list-id="activeListId"
              :loading="listsLoading"
              :error="listsError"
              @list-select="handleListSelect"
              @reload="() => loadLists()"
            />
            
            <div class="sidebar-divider"></div>
            
            <ListManager
              :lists="todoLists"
              :loading="listsLoading"
              @create-list="handleCreateList"
              @update-list="handleUpdateList"
              @delete-list="handleDeleteList"
            />
          </div>

          <div class="main-content">
            <div v-if="activeList" class="list-header">
              <h2>{{ activeList.name }}</h2>
              <span class="list-todo-count">
                {{ todos.length }} {{ todos.length === 1 ? 'todo' : 'todos' }}
              </span>
            </div>

            <div v-if="activeListId" class="todo-section">
              <TodoForm 
                @submit="handleCreateTodo" 
                :submitting="submitting"
                :placeholder="`Add a todo to ${activeList?.name || 'this list'}...`"
              />
              <TodoListComponent 
                :todos="todos" 
                @toggle="handleToggleTodo" 
                @delete="handleDeleteTodo" 
              />
            </div>

            <div v-else class="no-list-selected">
              <p>Select a list to view and manage your todos</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { todoApiClient } from '../api/TodoApiClient.js';
import type { Todo, TodoList } from '../types/todo.js';
import TodoForm from './TodoForm.vue';
import TodoListComponent from './TodoList.vue';
import ListSelector from './ListSelector.vue';
import ListManager from './ListManager.vue';

// Reactive state management
const todoLists = ref<TodoList[]>([]);
const todos = ref<Todo[]>([]);
const activeListId = ref<number | null>(null);

const loading = ref<boolean>(false);
const listsLoading = ref<boolean>(false);
const error = ref<string | null>(null);
const listsError = ref<string | null>(null);
const submitting = ref<boolean>(false);

// Computed properties
const activeList = computed(() => {
  return todoLists.value.find(list => list.id === activeListId.value) || null;
});

/**
 * Load all user data (lists and todos)
 */
const loadUserData = async (): Promise<void> => {
  const username = todoApiClient.getCurrentUsername();
  if (!username) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // Get user to ensure they exist
    const user = await todoApiClient.getOrCreateUser(username);
    await loadLists(user.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load user data';
    console.error('Error loading user data:', err);
  } finally {
    loading.value = false;
  }
};

/**
 * Load todo lists for the current user
 * Implements Requirements 5.1 - Display user's todo lists
 */
const loadLists = async (userId?: number): Promise<void> => {
  const username = todoApiClient.getCurrentUsername();
  if (!username) return;
  
  listsLoading.value = true;
  listsError.value = null;
  
  try {
    // Get user ID if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const user = await todoApiClient.getOrCreateUser(username);
      currentUserId = user.id;
    }
    
    const lists = await todoApiClient.getListsForUser(currentUserId);
    todoLists.value = lists;
    
    // Auto-select first list if none selected
    if (lists.length > 0 && !activeListId.value) {
      activeListId.value = lists[0].id;
      await loadTodosForList(lists[0].id);
    }
  } catch (err) {
    listsError.value = err instanceof Error ? err.message : 'Failed to load lists';
    console.error('Error loading lists:', err);
  } finally {
    listsLoading.value = false;
  }
};

/**
 * Load todos for a specific list
 * Implements Requirements 4.3, 5.2 - Display todos from selected list
 */
const loadTodosForList = async (listId: number): Promise<void> => {
  try {
    const listTodos = await todoApiClient.getTodosInList(listId);
    todos.value = listTodos;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load todos';
    console.error('Error loading todos:', err);
  }
};

/**
 * Handle list selection
 * Implements Requirements 5.2 - Handle list selection
 */
const handleListSelect = async (listId: number): Promise<void> => {
  if (listId === activeListId.value) return;
  
  activeListId.value = listId;
  await loadTodosForList(listId);
};

/**
 * Handle creating a new list
 * Implements Requirements 2.1, 2.2 - Create new todo list
 */
const handleCreateList = async (name: string): Promise<void> => {
  const username = todoApiClient.getCurrentUsername();
  if (!username) return;
  
  try {
    const user = await todoApiClient.getOrCreateUser(username);
    const newList = await todoApiClient.createList(user.id, name);
    todoLists.value.push(newList);
    
    // Auto-select the new list
    activeListId.value = newList.id;
    todos.value = []; // New list starts empty
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create list';
    console.error('Error creating list:', err);
  }
};

/**
 * Handle updating a list name
 * Implements Requirements 3.1 - Rename list
 */
const handleUpdateList = async (listId: number, name: string): Promise<void> => {
  try {
    const updatedList = await todoApiClient.updateList(listId, name);
    const index = todoLists.value.findIndex(list => list.id === listId);
    if (index !== -1) {
      todoLists.value[index] = updatedList;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update list';
    console.error('Error updating list:', err);
  }
};

/**
 * Handle deleting a list
 * Implements Requirements 3.2 - Delete list and todos
 */
const handleDeleteList = async (listId: number): Promise<void> => {
  try {
    await todoApiClient.deleteList(listId);
    todoLists.value = todoLists.value.filter(list => list.id !== listId);
    
    // If deleted list was active, select another list
    if (activeListId.value === listId) {
      if (todoLists.value.length > 0) {
        activeListId.value = todoLists.value[0].id;
        await loadTodosForList(todoLists.value[0].id);
      } else {
        activeListId.value = null;
        todos.value = [];
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete list';
    console.error('Error deleting list:', err);
  }
};

/**
 * Handle creating a new todo in the active list
 * Implements Requirements 4.1, 4.3 - Create todo in selected list
 */
const handleCreateTodo = async (text: string): Promise<void> => {
  if (!activeListId.value) {
    error.value = 'Please select a list first';
    return;
  }
  
  submitting.value = true;
  error.value = null;
  
  try {
    const newTodo = await todoApiClient.createTodoInList(activeListId.value, text);
    todos.value.push(newTodo);
    
    // Update list todo count
    const listIndex = todoLists.value.findIndex(list => list.id === activeListId.value);
    if (listIndex !== -1) {
      todoLists.value[listIndex].todo_count = (todoLists.value[listIndex].todo_count || 0) + 1;
    }
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
    
    // Update list todo count
    const listIndex = todoLists.value.findIndex(list => list.id === activeListId.value);
    if (listIndex !== -1 && todoLists.value[listIndex].todo_count) {
      todoLists.value[listIndex].todo_count = Math.max(0, todoLists.value[listIndex].todo_count - 1);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete todo';
    console.error('Error deleting todo:', err);
  }
};

// Initialize app when component mounts
onMounted(async () => {
  // Load user data if username is already set
  const username = todoApiClient.getCurrentUsername();
  if (username) {
    await loadUserData();
  }
});
</script>

<style scoped>
.todo-app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

.authenticated-app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px;
  width: 100%;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-state p {
  color: #7f8c8d;
  font-size: 1.2rem;
  margin: 0;
}

.error-state {
  text-align: center;
  padding: 60px 20px;
}

.error-message {
  color: #e74c3c;
  font-size: 1.1rem;
  margin: 0 0 20px 0;
  padding: 20px;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.retry-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #2980b9;
}

.app-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 30px;
  align-items: start;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-divider {
  height: 1px;
  background: #e1e8ed;
  margin: 10px 0;
}

.main-content {
  min-height: 500px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e1e8ed;
}

.list-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.75rem;
  font-weight: 500;
}

.list-todo-count {
  color: #7f8c8d;
  font-size: 1rem;
  background: #f8f9fa;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e1e8ed;
}

.todo-section {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.no-list-selected {
  text-align: center;
  padding: 80px 20px;
  color: #7f8c8d;
  font-size: 1.1rem;
}

.no-list-selected p {
  margin: 0;
  background: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  border: 2px dashed #e1e8ed;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .sidebar {
    order: 2;
  }
  
  .main-content {
    order: 1;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .list-header h2 {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .app-main {
    padding: 20px 15px;
  }
}
</style>