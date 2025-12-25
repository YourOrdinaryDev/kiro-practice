<template>
  <div id="app">
    <TodoApp />
  </div>
</template>

<script setup lang="ts">
import TodoApp from './components/TodoApp.vue';
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f8f9fa;
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
</style>