import { getDbConnection } from './connection.js';
import { DatabaseMigrations } from './migrations.js';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase(): Promise<void> {
  const db = getDbConnection();

  try {
    // Connect to the database
    await db.connect();

    // Run migrations
    const migrations = new DatabaseMigrations(db);
    await migrations.initializeDatabase();
    await migrations.createUpdateTrigger();

    // Ensure database file is in .gitignore
    await ensureGitIgnore();

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

async function ensureGitIgnore(): Promise<void> {
  const gitignorePath = path.resolve('.gitignore');
  const dbEntry = 'todos.db';

  try {
    let gitignoreContent = '';

    // Read existing .gitignore if it exists
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    }

    // Check if database file is already ignored
    if (!gitignoreContent.includes(dbEntry)) {
      // Add database file to .gitignore
      const newContent =
        gitignoreContent.trim() +
        '\n\n# SQLite database files\n' +
        dbEntry +
        '\n';
      fs.writeFileSync(gitignorePath, newContent);
      console.log('Added todos.db to .gitignore');
    }
  } catch (error) {
    console.warn('Could not update .gitignore:', error);
    // Don't throw error as this is not critical for database functionality
  }
}

export async function closeDatabase(): Promise<void> {
  const db = getDbConnection();
  await db.close();
}
