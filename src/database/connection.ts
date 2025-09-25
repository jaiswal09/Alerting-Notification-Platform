import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: sqlite3.Database;

  private constructor() {
    const dbPath = process.env.DATABASE_URL?.replace('sqlite:', '') || 
                   join(__dirname, '../../database/notifications.db');
    
    this.db = new sqlite3.Database(dbPath, (error) => {
      if (error) {
        console.error('Database connection failed:', error);
      } else {
        console.log('✅ Connected to SQLite database');
        this.configurePragmas();
      }
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private configurePragmas(): void {
    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
    
    // Set WAL mode for better concurrent access
    this.db.run('PRAGMA journal_mode = WAL');
    
    // Optimize performance
    this.db.run('PRAGMA synchronous = NORMAL');
    this.db.run('PRAGMA cache_size = 1000');
    this.db.run('PRAGMA temp_store = MEMORY');
  }

  public getDatabase(): sqlite3.Database {
    return this.db;
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  public async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
        } else {
          resolve(row as T || null);
        }
      });
    });
  }

  public async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(error) {
        if (error) {
          reject(error);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  public async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.db.serialize(async () => {
        try {
          this.db.run('BEGIN TRANSACTION');
          const result = await callback();
          this.db.run('COMMIT');
          resolve(result);
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  public close(): void {
    this.db.close((error) => {
      if (error) {
        console.error('Error closing database:', error);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

export default DatabaseConnection;