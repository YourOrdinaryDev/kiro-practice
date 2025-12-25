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
      throw new Error(
        `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async runMigrations(): Promise<void> {
    try {
      // Check if migrations table exists
      await this.createMigrationsTable();

      // Run all pending migrations
      await this.addUsernameColumnMigration();
      await this.migrateToMultiListSchema();

      console.log('All migrations completed successfully');
    } catch (error) {
      throw new Error(
        `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const tableInfo = await this.db.all('PRAGMA table_info(todos)');
    const usernameColumnExists = tableInfo.some(
      (column: any) => column.name === 'username'
    );

    if (!usernameColumnExists) {
      // Add username column with default value for existing records
      await this.db.run(
        'ALTER TABLE todos ADD COLUMN username TEXT NOT NULL DEFAULT ""'
      );
      console.log('Added username column to todos table');
    }

    // Record migration as completed
    await this.db.run('INSERT INTO migrations (name) VALUES (?)', [
      migrationName,
    ]);

    console.log(`Migration ${migrationName} completed`);
  }

  private async migrateToMultiListSchema(): Promise<void> {
    const migrationName = 'migrate_to_multi_list_schema';

    // Check if migration has already been executed
    const existingMigration = await this.db.get(
      'SELECT name FROM migrations WHERE name = ?',
      [migrationName]
    );

    if (existingMigration) {
      console.log(`Migration ${migrationName} already executed, skipping`);
      return;
    }

    console.log('Starting migration to multi-list schema...');

    // Step 1: Create new tables
    await this.createUsersTable();
    await this.createTodoListsTable();
    await this.createNewTodosTable();

    // Step 2: Check if there are existing todos to migrate
    const existingTodos = await this.db.all('SELECT * FROM todos');

    if (existingTodos.length > 0) {
      console.log(`Found ${existingTodos.length} existing todos to migrate`);

      // Step 3: Create default user
      const defaultUser = await this.createDefaultUser();

      // Step 4: Create default list for the user
      const defaultList = await this.createDefaultList(defaultUser.id);

      // Step 5: Migrate existing todos to the new structure
      await this.migrateExistingTodos(existingTodos, defaultList.id);

      console.log('Successfully migrated existing todos to new schema');
    } else {
      console.log('No existing todos found, skipping data migration');
    }

    // Step 6: Rename old table and new table
    await this.db.run('ALTER TABLE todos RENAME TO todos_old');
    await this.db.run('ALTER TABLE todos_new RENAME TO todos');

    // Step 7: Create indexes for new schema
    await this.createNewSchemaIndexes();

    // Record migration as completed
    await this.db.run('INSERT INTO migrations (name) VALUES (?)', [
      migrationName,
    ]);

    console.log(`Migration ${migrationName} completed successfully`);
  }

  private async createUsersTable(): Promise<void> {
    const createUsersTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db.run(createUsersTableSQL);
    console.log('Users table created');
  }

  private async createTodoListsTable(): Promise<void> {
    const createTodoListsTableSQL = `
      CREATE TABLE IF NOT EXISTS todo_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(name, user_id)
      )
    `;

    await this.db.run(createTodoListsTableSQL);
    console.log('Todo lists table created');
  }

  private async createNewTodosTable(): Promise<void> {
    const createNewTodosTableSQL = `
      CREATE TABLE IF NOT EXISTS todos_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        list_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES todo_lists(id) ON DELETE CASCADE
      )
    `;

    await this.db.run(createNewTodosTableSQL);
    console.log('New todos table created');
  }

  private async createDefaultUser(): Promise<{ id: number; username: string }> {
    const defaultUsername = 'default_user';

    // Check if default user already exists
    const existingUser = await this.db.get(
      'SELECT id, username FROM users WHERE username = ?',
      [defaultUsername]
    );

    if (existingUser) {
      console.log('Default user already exists');
      return existingUser as { id: number; username: string };
    }

    // Create default user
    const result = await this.db.run(
      'INSERT INTO users (username) VALUES (?)',
      [defaultUsername]
    );

    console.log(`Created default user with ID: ${result.lastID}`);
    return { id: result.lastID!, username: defaultUsername };
  }

  private async createDefaultList(
    userId: number
  ): Promise<{ id: number; name: string }> {
    const defaultListName = 'My Tasks';

    // Check if default list already exists for this user
    const existingList = await this.db.get(
      'SELECT id, name FROM todo_lists WHERE user_id = ? AND name = ?',
      [userId, defaultListName]
    );

    if (existingList) {
      console.log('Default list already exists');
      return existingList as { id: number; name: string };
    }

    // Create default list
    const result = await this.db.run(
      'INSERT INTO todo_lists (name, user_id) VALUES (?, ?)',
      [defaultListName, userId]
    );

    console.log(
      `Created default list "${defaultListName}" with ID: ${result.lastID}`
    );
    return { id: result.lastID!, name: defaultListName };
  }

  private async migrateExistingTodos(
    existingTodos: any[],
    listId: number
  ): Promise<void> {
    for (const todo of existingTodos) {
      await this.db.run(
        'INSERT INTO todos_new (text, completed, list_id, created_at) VALUES (?, ?, ?, ?)',
        [todo.text, todo.completed, listId, todo.created_at]
      );
    }

    console.log(`Migrated ${existingTodos.length} todos to list ID: ${listId}`);
  }

  private async createNewSchemaIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_todo_lists_user_id ON todo_lists(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_todo_lists_name_user ON todo_lists(name, user_id)',
      'CREATE INDEX IF NOT EXISTS idx_todos_list_id ON todos(list_id)',
      'CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)',
      'CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at)',
    ];

    for (const indexSQL of indexes) {
      await this.db.run(indexSQL);
    }
    console.log('New schema indexes created');
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
    // Only create indexes for the original schema if we haven't migrated yet
    const migrationExists = await this.db.get(
      'SELECT name FROM migrations WHERE name = ?',
      ['migrate_to_multi_list_schema']
    );

    if (!migrationExists) {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)',
        'CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_todos_username ON todos(username)',
        'CREATE INDEX IF NOT EXISTS idx_todos_username_completed ON todos(username, completed)',
      ];

      for (const indexSQL of indexes) {
        await this.db.run(indexSQL);
      }
      console.log('Original schema indexes created');
    }
  }

  async createUpdateTrigger(): Promise<void> {
    // Check if we're using the new schema
    const migration = await this.db.get(
      'SELECT name FROM migrations WHERE name = ?',
      ['migrate_to_multi_list_schema']
    );

    if (migration) {
      // New schema doesn't need updated_at trigger since we don't have updated_at column
      console.log('Skipping update trigger creation for new schema');
      return;
    }

    // Old schema: create the updated_at trigger
    const triggerSQL = `
      CREATE TRIGGER IF NOT EXISTS update_todos_updated_at
      AFTER UPDATE ON todos
      FOR EACH ROW
      BEGIN
        UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END
    `;

    await this.db.run(triggerSQL);
    console.log('Update trigger created for old schema');
  }
}
