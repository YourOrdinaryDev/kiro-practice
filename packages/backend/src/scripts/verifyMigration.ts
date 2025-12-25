#!/usr/bin/env node

import { getDbConnection } from '../database/connection.js';

async function verifyMigration() {
  const db = getDbConnection();
  
  try {
    await db.connect();
    
    console.log('=== Database Migration Verification ===\n');
    
    // Check if new tables exist
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('users', 'todo_lists', 'todos')
      ORDER BY name
    `);
    
    console.log('✓ Tables found:', tables.map(t => t.name).join(', '));
    
    // Check users table
    const users = await db.all('SELECT * FROM users');
    console.log(`✓ Users table: ${users.length} users found`);
    if (users.length > 0) {
      console.log('  Sample user:', users[0]);
    }
    
    // Check todo_lists table
    const lists = await db.all('SELECT * FROM todo_lists');
    console.log(`✓ Todo lists table: ${lists.length} lists found`);
    if (lists.length > 0) {
      console.log('  Sample list:', lists[0]);
    }
    
    // Check todos table
    const todos = await db.all('SELECT * FROM todos');
    console.log(`✓ Todos table: ${todos.length} todos found`);
    if (todos.length > 0) {
      console.log('  Sample todo:', todos[0]);
    }
    
    // Check foreign key constraints
    const fkCheck = await db.all('PRAGMA foreign_key_check');
    if (fkCheck.length === 0) {
      console.log('✓ Foreign key constraints: All valid');
    } else {
      console.log('⚠ Foreign key constraint violations:', fkCheck);
    }
    
    // Check if old table exists (should be renamed to todos_old)
    const oldTable = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='todos_old'
    `);
    
    if (oldTable) {
      console.log('✓ Old table preserved as todos_old for backup');
    } else {
      console.log('ℹ No old table backup found (migration may have been clean)');
    }
    
    // Verify data relationships
    const todoListJoin = await db.all(`
      SELECT t.id, t.text, t.completed, tl.name as list_name, u.username
      FROM todos t
      JOIN todo_lists tl ON t.list_id = tl.id
      JOIN users u ON tl.user_id = u.id
      LIMIT 5
    `);
    
    console.log(`✓ Data relationships: ${todoListJoin.length} todos properly linked`);
    if (todoListJoin.length > 0) {
      console.log('  Sample linked data:', todoListJoin[0]);
    }
    
    console.log('\n=== Migration Verification Complete ===');
    
  } catch (error) {
    console.error('Migration verification failed:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMigration().catch(console.error);
}

export { verifyMigration };