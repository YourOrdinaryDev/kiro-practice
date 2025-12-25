import { DatabaseConnection } from './connection.js';

export class DatabaseMigrations {
  constructor(private db: DatabaseConnection) {}

  async initializeDatabase(): Promise<void> {
    try {
      await this.createTodosTable();
      await this.createIndexes();
      console.log('Database initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      'CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at)'
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