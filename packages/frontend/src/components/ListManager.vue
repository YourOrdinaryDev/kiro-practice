<template>
  <div class="list-manager">
    <header class="manager-header">
      <h2>Manage Lists</h2>
    </header>

    <!-- Create new list form -->
    <div class="create-section">
      <h3>Create New List</h3>
      <form @submit.prevent="handleCreateList" class="create-form">
        <div class="form-group">
          <input
            v-model="newListName"
            type="text"
            class="form-input"
            :class="{ 'form-input--error': createError }"
            placeholder="Enter list name"
            maxlength="100"
            :disabled="creating"
            @input="clearCreateError"
          />
          <button
            type="submit"
            class="create-button"
            :disabled="!newListName.trim() || creating"
          >
            <span v-if="creating" class="loading-spinner"></span>
            {{ creating ? 'Creating...' : 'Create List' }}
          </button>
        </div>
        <div v-if="createError" class="form-error">
          {{ createError }}
        </div>
      </form>
    </div>

    <!-- Existing lists management -->
    <div v-if="lists.length > 0" class="manage-section">
      <h3>Your Lists</h3>
      <div class="lists-grid">
        <div
          v-for="list in lists"
          :key="list.id"
          class="list-card"
        >
          <div class="list-header">
            <div v-if="editingListId === list.id" class="edit-form">
              <input
                v-model="editListName"
                type="text"
                class="edit-input"
                :class="{ 'edit-input--error': editError }"
                maxlength="100"
                @keyup.enter="handleSaveEdit(list.id)"
                @keyup.escape="cancelEdit"
                @input="clearEditError"
              />
              <div class="edit-actions">
                <button
                  @click="handleSaveEdit(list.id)"
                  class="save-button"
                  :disabled="!editListName.trim() || updating"
                >
                  Save
                </button>
                <button
                  @click="cancelEdit"
                  class="cancel-button"
                  :disabled="updating"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div v-else class="list-display">
              <h4 class="list-title">{{ list.name }}</h4>
              <span class="todo-count">
                {{ list.todo_count || 0 }} {{ (list.todo_count || 0) === 1 ? 'todo' : 'todos' }}
              </span>
            </div>
          </div>

          <div v-if="editError && editingListId === list.id" class="form-error">
            {{ editError }}
          </div>

          <div class="list-actions">
            <button
              v-if="editingListId !== list.id"
              @click="startEdit(list)"
              class="action-button edit-action"
              :disabled="updating || deleting !== null"
            >
              Rename
            </button>
            <button
              v-if="editingListId !== list.id && canDeleteList(list)"
              @click="handleDeleteList(list)"
              class="action-button delete-action"
              :disabled="updating || deleting !== null"
            >
              {{ deleting === list.id ? 'Deleting...' : 'Delete' }}
            </button>
            <span v-if="!canDeleteList(list)" class="delete-disabled-hint">
              Cannot delete last list
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation dialog -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="confirmation-dialog" @click.stop>
        <h3>Delete List</h3>
        <p>
          Are you sure you want to delete "<strong>{{ listToDelete?.name }}</strong>"?
        </p>
        <p class="warning-text">
          This will permanently delete the list and all {{ listToDelete?.todo_count || 0 }} todos in it.
          This action cannot be undone.
        </p>
        <div class="dialog-actions">
          <button @click="cancelDelete" class="cancel-button">
            Cancel
          </button>
          <button @click="confirmDelete" class="delete-confirm-button">
            Delete List
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TodoList } from '../types/todo.js';

// Props
interface Props {
  lists: TodoList[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
});

// Emits
const emit = defineEmits<{
  createList: [name: string];
  updateList: [listId: number, name: string];
  deleteList: [listId: number];
}>();

// Reactive state
const newListName = ref<string>('');
const creating = ref<boolean>(false);
const createError = ref<string | null>(null);

const editingListId = ref<number | null>(null);
const editListName = ref<string>('');
const updating = ref<boolean>(false);
const editError = ref<string | null>(null);

const showDeleteConfirm = ref<boolean>(false);
const listToDelete = ref<TodoList | null>(null);
const deleting = ref<number | null>(null);

// Computed properties
const canDeleteList = computed(() => {
  return (list: TodoList) => {
    // Requirement 7.2, 7.3: Cannot delete last remaining list
    return props.lists.length > 1;
  };
});

/**
 * Validate list name according to requirements
 * @param name The list name to validate
 * @returns Validation error message or null if valid
 */
const validateListName = (name: string): string | null => {
  // Requirement 2.1: Non-empty list name required
  if (!name || name.trim().length === 0) {
    return 'List name cannot be empty';
  }

  // Requirement 2.5: Reject whitespace-only names
  if (name.trim() !== name || /^\s+$/.test(name)) {
    return 'List name cannot contain only whitespace';
  }

  // Check for duplicate names (Requirement 2.2, 3.4)
  const trimmedName = name.trim();
  const existingList = props.lists.find(list => 
    list.name.toLowerCase() === trimmedName.toLowerCase() && 
    list.id !== editingListId.value
  );
  
  if (existingList) {
    return 'A list with this name already exists';
  }

  return null;
};

/**
 * Clear create form error
 */
const clearCreateError = (): void => {
  createError.value = null;
};

/**
 * Clear edit form error
 */
const clearEditError = (): void => {
  editError.value = null;
};

/**
 * Handle creating a new list
 * Implements Requirements 2.1, 2.2 - Create list with validation
 */
const handleCreateList = async (): Promise<void> => {
  const trimmedName = newListName.value.trim();
  
  // Validate list name
  const validationError = validateListName(trimmedName);
  if (validationError) {
    createError.value = validationError;
    return;
  }

  creating.value = true;
  createError.value = null;

  try {
    emit('createList', trimmedName);
    newListName.value = '';
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Failed to create list';
  } finally {
    creating.value = false;
  }
};

/**
 * Start editing a list name
 * @param list The list to edit
 */
const startEdit = (list: TodoList): void => {
  editingListId.value = list.id;
  editListName.value = list.name;
  editError.value = null;
};

/**
 * Cancel editing
 */
const cancelEdit = (): void => {
  editingListId.value = null;
  editListName.value = '';
  editError.value = null;
};

/**
 * Handle saving list name edit
 * Implements Requirements 3.1, 3.4 - Rename list with validation
 */
const handleSaveEdit = async (listId: number): Promise<void> => {
  const trimmedName = editListName.value.trim();
  
  // Validate list name
  const validationError = validateListName(trimmedName);
  if (validationError) {
    editError.value = validationError;
    return;
  }

  updating.value = true;
  editError.value = null;

  try {
    emit('updateList', listId, trimmedName);
    cancelEdit();
  } catch (error) {
    editError.value = error instanceof Error ? error.message : 'Failed to update list';
  } finally {
    updating.value = false;
  }
};

/**
 * Handle delete list request
 * Implements Requirements 3.2, 3.5 - Delete with confirmation
 */
const handleDeleteList = (list: TodoList): void => {
  if (!canDeleteList.value(list)) {
    return;
  }

  listToDelete.value = list;
  showDeleteConfirm.value = true;
};

/**
 * Cancel delete operation
 */
const cancelDelete = (): void => {
  showDeleteConfirm.value = false;
  listToDelete.value = null;
};

/**
 * Confirm and execute delete operation
 */
const confirmDelete = async (): Promise<void> => {
  if (!listToDelete.value) return;

  const listId = listToDelete.value.id;
  deleting.value = listId;

  try {
    emit('deleteList', listId);
    showDeleteConfirm.value = false;
    listToDelete.value = null;
  } catch (error) {
    console.error('Failed to delete list:', error);
  } finally {
    deleting.value = null;
  }
};
</script>

<style scoped>
.list-manager {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.manager-header {
  padding: 20px;
  border-bottom: 1px solid #e1e8ed;
  background: #f8f9fa;
}

.manager-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.create-section {
  padding: 20px;
  border-bottom: 1px solid #e1e8ed;
}

.create-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 500;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-group {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.form-input {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
}

.form-input--error {
  border-color: #e74c3c;
}

.form-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}

.create-button {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.create-button:hover:not(:disabled) {
  background-color: #229954;
}

.create-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.manage-section {
  padding: 20px;
}

.manage-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 500;
}

.lists-grid {
  display: grid;
  gap: 15px;
}

.list-card {
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  padding: 15px;
  background: #fafbfc;
}

.list-header {
  margin-bottom: 10px;
}

.list-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-title {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 500;
}

.todo-count {
  color: #7f8c8d;
  font-size: 0.85rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-input {
  padding: 8px 10px;
  border: 2px solid #3498db;
  border-radius: 4px;
  font-size: 0.9rem;
}

.edit-input--error {
  border-color: #e74c3c;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.list-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.edit-action {
  background-color: #3498db;
  color: white;
}

.edit-action:hover:not(:disabled) {
  background-color: #2980b9;
}

.delete-action {
  background-color: #e74c3c;
  color: white;
}

.delete-action:hover:not(:disabled) {
  background-color: #c0392b;
}

.save-button {
  background-color: #27ae60;
  color: white;
}

.save-button:hover:not(:disabled) {
  background-color: #229954;
}

.cancel-button {
  background-color: #95a5a6;
  color: white;
}

.cancel-button:hover:not(:disabled) {
  background-color: #7f8c8d;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.delete-disabled-hint {
  color: #95a5a6;
  font-size: 0.8rem;
  font-style: italic;
}

.form-error {
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 4px;
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirmation-dialog {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.confirmation-dialog h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.confirmation-dialog p {
  margin: 0 0 10px 0;
  color: #2c3e50;
  line-height: 1.5;
}

.warning-text {
  color: #e74c3c;
  font-size: 0.9rem;
  background: #fdf2f2;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.delete-confirm-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.delete-confirm-button:hover {
  background-color: #c0392b;
}

/* Responsive design */
@media (max-width: 480px) {
  .form-group {
    flex-direction: column;
  }
  
  .create-button {
    align-self: flex-start;
  }
  
  .list-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .list-actions {
    flex-wrap: wrap;
  }
  
  .confirmation-dialog {
    margin: 20px;
  }
}
</style>