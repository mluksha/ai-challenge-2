/**
 * db/connection.ts
 *
 * Opens and configures the SQLite connection via better-sqlite3.
 * Exports a singleton `db` used by all repository modules.
 *
 * better-sqlite3 is synchronous by design — this fits perfectly with
 * the synchronous MCP tool handler pattern.
 *
 * Stages that modify this file: 1
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let _db: Database.Database | null = null;

/**
 * Returns the open SQLite database, creating it at `dbPath` if it does not exist.
 * The directory is created automatically.
 * Must be called after loadConfig().
 */
export function openDatabase(dbPath: string): Database.Database {
  if (_db) return _db;

  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance and crash safety
  db.pragma("journal_mode = WAL");
  // Enforce foreign key constraints
  db.pragma("foreign_keys = ON");

  _db = db;
  return _db;
}

/**
 * Returns the cached database instance.
 * Throws if openDatabase() was not called first.
 */
export function getDb(): Database.Database {
  if (!_db) {
    throw new Error("[db] Database not initialised. Call openDatabase() first.");
  }
  return _db;
}
