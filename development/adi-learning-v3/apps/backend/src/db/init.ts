import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(import.meta.dir, '../../data/adi.db');

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH, { create: true });
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    // Run schema
    const schema = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf-8');
    db.exec(schema);

    // Run seed
    const seed = readFileSync(join(import.meta.dir, 'seed.sql'), 'utf-8');
    db.exec(seed);

    console.log('[db] Initialized SQLite at', DB_PATH);
  }
  return db;
}
