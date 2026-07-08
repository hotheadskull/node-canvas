import { drizzle } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';

// This acts as a singleton for the database connection
let dbInstance: any = null;

export async function initDb() {
  if (dbInstance) return dbInstance;

  // Load the SQLite database via Tauri Rust backend
  const tauriDb = await Database.load('sqlite:world_engine.db');

  // Create the Drizzle proxy that intercepts SQL and sends it via Tauri IPC
  const db = drizzle(async (sql: string, params: any[], method: 'run' | 'all' | 'get' | 'values') => {
    try {
      if (method === 'run') {
        await tauriDb.execute(sql, params);
        // Drizzle run expects rows/insertId
        return { rows: [] }; 
      }
      
      // select
      const result = (await tauriDb.select(sql, params)) as any[];
      
      // Drizzle proxy expects rows to be an array of arrays representing the columns
      // For Tauri select, it returns an array of objects: [{ id: 1, name: 'foo' }]
      const rows = result.map((row) => Object.values(row));
      
      return { rows };
    } catch (e: any) {
      console.error('SQL Execution Error:', e, 'SQL:', sql, 'Params:', params);
      return { rows: [] };
    }
  }, { schema });

  dbInstance = { db, tauriDb };
  return dbInstance;
}

export async function runMigrations() {
  const { tauriDb } = await initDb();
  
  // Use Vite's import.meta.glob to read raw SQL migration files at runtime
  const migrations = import.meta.glob('./migrations/*.sql', { query: '?raw', import: 'default' });
  
  // Create a basic migrations table if it doesn't exist to track what we ran
  await tauriDb.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const appliedRows = (await tauriDb.select('SELECT filename FROM __drizzle_migrations')) as {filename: string}[];
  const applied = new Set(appliedRows.map((r: any) => r.filename));

  const filenames = Object.keys(migrations).sort();
  for (const filename of filenames) {
    const baseName = filename.split('/').pop()!;
    if (!applied.has(baseName)) {
      console.log(`Applying migration: ${baseName}`);
      const sqlContent = (await migrations[filename]()) as string;
      
      // Tauri execute expects a single query, but a migration file has many queries.
      // Drizzle uses '--> statement-breakpoint' to separate statements.
      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      for (const statement of statements) {
        // Also remove any lingering trailing semicolons or comments if needed
        await tauriDb.execute(statement);
      }
      
      await tauriDb.execute('INSERT INTO __drizzle_migrations (filename) VALUES ($1)', [baseName]);
      console.log(`Successfully applied: ${baseName}`);
    }
  }
}
