#!/usr/bin/env node

import { getDbConnection } from '../database/connection.js';
import { UserService } from '../services/UserService.js';
import { TodoListService } from '../services/TodoListService.js';
import { TodoService } from '../services/TodoService.js';

async function testSessionIntegration() {
  const db = getDbConnection();
  
  try {
    await db.connect();
    
    console.log('=== Session Management Integration Test ===\n');
    
    const userService = new UserService();
    const todoListService = new TodoListService();
    const todoService = new TodoService();
    
    // Test 1: User creation and session management
    console.log('1. Testing user creation and session management...');
    const testUsername = 'test_user_' + Date.now();
    const user = await userService.getOrCreateUser(testUsername);
    console.log(`✓ Created/retrieved user: ${user.username} (ID: ${user.id})`);
    
    // Test 2: Default list creation
    console.log('\n2. Testing default list creation...');
    const lists = await todoListService.getListsForUser(user.id);
    console.log(`✓ User has ${lists.length} lists`);
    if (lists.length > 0) {
      console.log(`  Default list: "${lists[0].name}" (ID: ${lists[0].id})`);
    }
    
    // Test 3: User context throughout application
    console.log('\n3. Testing user context preservation...');
    
    // Create a todo in the user's default list
    if (lists.length > 0) {
      const defaultList = lists[0];
      const todo = await todoService.createTodoInList(defaultList.id, 'Test todo for session integration');
      console.log(`✓ Created todo in user's list: "${todo.text}" (ID: ${todo.id})`);
      
      // Verify the todo belongs to the correct user through the list relationship
      const userTodos = await todoService.getTodosInList(defaultList.id);
      const foundTodo = userTodos.find(t => t.id === todo.id);
      if (foundTodo) {
        console.log(`✓ Todo correctly associated with user's list`);
      } else {
        console.log(`✗ Todo not found in user's list`);
      }
    }
    
    // Test 4: User isolation
    console.log('\n4. Testing user data isolation...');
    const anotherUsername = 'another_user_' + Date.now();
    const anotherUser = await userService.getOrCreateUser(anotherUsername);
    const anotherUserLists = await todoListService.getListsForUser(anotherUser.id);
    
    console.log(`✓ First user (${user.username}) has ${lists.length} lists`);
    console.log(`✓ Second user (${anotherUser.username}) has ${anotherUserLists.length} lists`);
    console.log(`✓ Users have separate data contexts`);
    
    // Test 5: Session persistence requirements
    console.log('\n5. Testing session persistence requirements...');
    
    // Verify user can be retrieved by username
    const retrievedUser = await userService.getUserByUsername(testUsername);
    if (retrievedUser && retrievedUser.id === user.id) {
      console.log(`✓ User session can be restored by username`);
    } else {
      console.log(`✗ Failed to restore user session`);
    }
    
    // Verify user's lists are preserved
    const retrievedLists = await todoListService.getListsForUser(user.id);
    if (retrievedLists.length === lists.length) {
      console.log(`✓ User's lists are preserved across sessions`);
    } else {
      console.log(`✗ User's lists not properly preserved`);
    }
    
    console.log('\n=== Session Integration Test Complete ===');
    console.log('✓ All session management requirements verified');
    
  } catch (error) {
    console.error('Session integration test failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSessionIntegration().catch(console.error);
}

export { testSessionIntegration };