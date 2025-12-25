import { DatabaseConnection } from './connection.js';

export class DatabaseMigrations {
  constructor(private db: DatabaseConnection) {}

  async initializeDatabase(): Promise<void> {
    try {
      await this.createTodosTable();
      await this.runMigrations();
      await this.createIndexes();
      console.log('Database initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async runMigrations(): Promise<void> {
    try {
      // Check if migrations table exists
      await this.createMigrationsTable();
      
      // Run all pending migrations
      await this.addUsernameColumnMigration();
      
      console.log('All migrations completed successfully');
    } catch (error) {
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const createMigrationsTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.db.run(createMigrationsTableSQL);
  }

  private async addUsernameColumnMigration(): Promise<void> {
    const migrationName = 'add_username_column';
    
    // Check if migration has already been executed
    const existingMigration = await this.db.get(
      'SELECT name FROM migrations WHERE name = ?',
      [migrationName]
    );
    
    if (existingMigration) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return;
    }

    // Check if username column already exists
    const tableInfo = await this.db.all("PRAGMA table_info(todos)");
    const usernameColumnExists = tableInfo.some((column: any) => column.name === 'username');
    
    if (!usernameColumnExists) {
      // Add username column with default value for existing records
      await this.db.run('ALTER TABLE todos ADD COLUMN username TEXT NOT NULL DEFAULT ""');
      console.log('Added username column to todos table');
    }

    // Record migration as completed
    await this.db.run(
      'INSERT INTO migrations (name) VALUES (?)',
      [migrationName]
    );
    
    console.log(`Migration ${migrationName} completed`);
  }

  private async createTodosTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL CHECK(length(trim(text)) > 0),
        completed BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db.run(createTableSQL);
    console.log('Todos table created or already exists');
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)',
      'CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_todos_username ON todos(username)',
      'CREATE INDEX IF NOT EXISTS idx_todos_username_completed ON todos(username, completed)'
    ];

    for (const indexSQL of indexes) {
      await this.db.run(indexSQL);
    }
    console.log('Database indexes created');
  }

  async createUpdateTrigger(): Promise<void> {
    const triggerSQL = `
      CREATE TRIGGER IF NOT EXISTS update_todos_updated_at
      AFTER UPDATE ON todos
      FOR EACH ROW
      BEGIN
        UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;

    await this.db.run(triggerSQL);
    console.log('Update trigger created');
  }
}