/**
 * db/migrations.ts
 *
 * Applies schema migrations in order.
 * Each migration is identified by a version number and is idempotent:
 * already-applied migrations are skipped on restart.
 *
 * Migration strategy:
 *   - A `schema_migrations` table tracks applied versions.
 *   - On startup, any migrations with version > current max are applied in order.
 *   - Migrations run inside a single transaction to be atomic.
 *
 * Stages that modify this file:
 *   - Stage 1: schema_migrations table + version 1 (server_meta)
 *   - Stage 2: version 2 (flights, schedule_entries, airport_resources)
 *   - Stage 4: version 3 (config_snapshots)
 */

import type Database from "better-sqlite3";

interface Migration {
  version: number;
  description: string;
  up: string; /** Raw SQL — may contain multiple statements separated by ; */
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: "Create schema_migrations and server_meta tables",
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        description TEXT    NOT NULL,
        applied_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE TABLE IF NOT EXISTS server_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT OR IGNORE INTO server_meta (key, value)
        VALUES ('schema_version', '1');
    `,
  },
  // Stage 2 will add version 2 here (flights, schedule_entries, etc.)
  // Stage 4 will add version 3 here (config_snapshots)
];

/**
 * Runs all pending migrations against the provided database connection.
 * Returns the final schema version number.
 */
export function runMigrations(db: Database.Database): number {
  // Ensure the migrations table exists before querying it
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      description TEXT    NOT NULL,
      applied_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  const appliedVersions = new Set<number>(
    (
      db
        .prepare("SELECT version FROM schema_migrations ORDER BY version")
        .all() as { version: number }[]
    ).map((r) => r.version)
  );

  let lastVersion = appliedVersions.size > 0 ? Math.max(...appliedVersions) : 0;

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    const applyMigration = db.transaction(() => {
      // Split on semicolons and run each statement individually
      const statements = migration.up
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        db.exec(stmt + ";");
      }

      db.prepare(
        "INSERT INTO schema_migrations (version, description) VALUES (?, ?)"
      ).run(migration.version, migration.description);
    });

    applyMigration();
    lastVersion = migration.version;
    console.error(
      `[migrations] Applied version ${migration.version}: ${migration.description}`
    );
  }

  return lastVersion;
}

/**
 * Returns the currently applied schema version (0 if none).
 */
export function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db
      .prepare(
        "SELECT MAX(version) as v FROM schema_migrations"
      )
      .get() as { v: number | null };
    return row?.v ?? 0;
  } catch {
    return 0;
  }
}
