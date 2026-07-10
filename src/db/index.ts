import { drizzle } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import * as schema from './schema';
// This acts as a singleton for the database connection
let dbInstance: any = null;

export async function initDb() {
  if (dbInstance) return dbInstance;

  // Load the SQLite database via Tauri Rust backend.
  // The filename is a legacy of the app's original working title -- renaming it
  // would orphan existing users' data, so it stays "world_engine.db".
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
      // Rethrow so callers can tell a failed write from a successful one --
      // swallowing here made the UI show data that was never persisted.
      throw e instanceof Error ? e : new Error(String(e));
    }
  }, { schema });

  dbInstance = { db, tauriDb };
  return dbInstance;
}

export async function runMigrations() {
  const { tauriDb } = await initDb();
  
  // Backup before doing anything
  try {
    const backupName = await invoke('backup_db');
    console.log(`Database backed up to: ${backupName}`);
  } catch (e) {
    console.warn(`Failed to backup database before migrations:`, e);
  }
  
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
        
      await tauriDb.execute('BEGIN');
      try {
        for (const statement of statements) {
          try {
            await tauriDb.execute(statement);
          } catch (e: any) {
            // Self-heal partially-applied migrations: if a column/table already
            // exists, that statement is already done -- skip it. Any other
            // error is real and must abort the migration.
            const msg = String(e).toLowerCase();
            if (msg.includes('duplicate column name') || msg.includes('already exists')) {
              console.warn(`Skipping already-applied statement in ${baseName}: ${msg}`);
              continue;
            }
            throw e;
          }
        }
        
        await tauriDb.execute('INSERT INTO __drizzle_migrations (filename) VALUES ($1)', [baseName]);
        await tauriDb.execute('COMMIT');
        console.log(`Successfully applied: ${baseName}`);
      } catch (e) {
        await tauriDb.execute('ROLLBACK');
        console.error(`Failed to apply migration ${baseName}:`, e);
        throw e; // Stop further migrations
      }
    }
  }
}
