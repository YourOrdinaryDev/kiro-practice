<template>
  <div id="app">
    <h1>{{ message }}</h1>
    <p>Welcome to your Vue 3 + TypeScript app!</p>
    
    <div class="api-section">
      <button @click="fetchFromBackend" :disabled="loading">
        {{ loading ? 'Loading...' : 'Fetch from Backend' }}
      </button>
      
      <div v-if="backendMessage" class="backend-response">
        <h3>Backend Response:</h3>
        <p>{{ backendMessage }}</p>
      </div>
      
      <div v-if="error" class="error">
        <p>Error: {{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const message = ref<string>('Hello Vue 3!');
const backendMessage = ref<string>('');
const loading = ref<boolean>(false);
const error = ref<string>('');

const fetchFromBackend = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await fetch('http://localhost:3001/api/hello');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    backendMessage.value = data.message;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error fetching from backend:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

h1 {
  color: #42b883;
}

.api-section {
  margin-top: 40px;
}

button {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #369870;
}

button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.backend-response {
  margin-top: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #42b883;
}

.backend-response h3 {
  margin-top: 0;
  color: #2c3e50;
}

.error {
  margin-top: 20px;
  padding: 20px;
  background-color: #fee;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  color: #c0392b;
}
</style>