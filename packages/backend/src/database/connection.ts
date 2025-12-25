import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = 'todos.db') {
    this.dbPath = path.resolve(dbPath);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          console.log(`Connected to SQLite database at ${this.dbPath}`);
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
        } else {
          console.log('Database connection closed');
          this.db = null;
          resolve();
        }
      });
    });
  }

  getDatabase(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T | undefined);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }
}

// Singleton instance
let dbInstance: DatabaseConnection | null = null;

export function getDbConnection(): DatabaseConnection {
  if (!dbInstance) {
    dbInstance = new DatabaseConnection();
  }
  return dbInstance;
}