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
  {
    version: 2,
    description: "Create flights and schedule_entries tables",
    up: `
      CREATE TABLE IF NOT EXISTS flights (
        id               TEXT    PRIMARY KEY,
        flight_number    TEXT    NOT NULL,
        operation_type   TEXT    NOT NULL
                         CHECK (operation_type IN ('arrival','departure')),
        priority         TEXT    NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('high','medium','low')),
        state            TEXT    NOT NULL DEFAULT 'queued'
                         CHECK (state IN ('queued','scheduled','completed','cancelled','blocked')),
        scheduled_time   TEXT    NULL,
        depends_on       TEXT    NULL,
        preferred_runway INTEGER NULL,
        block_reason     TEXT    NULL,
        created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_flights_state
        ON flights (state);

      CREATE INDEX IF NOT EXISTS idx_flights_priority
        ON flights (priority);

      CREATE TABLE IF NOT EXISTS schedule_entries (
        id               TEXT    PRIMARY KEY,
        flight_id        TEXT    NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
        runway_id        INTEGER NOT NULL,
        gate_id          INTEGER NOT NULL,
        crew_id          INTEGER NOT NULL,
        start_time       TEXT    NOT NULL,
        end_time         TEXT    NOT NULL,
        duration_minutes INTEGER NOT NULL,
        created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );

      CREATE INDEX IF NOT EXISTS idx_schedule_flight_id
        ON schedule_entries (flight_id);

      CREATE INDEX IF NOT EXISTS idx_schedule_runway_time
        ON schedule_entries (runway_id, start_time, end_time);

      CREATE INDEX IF NOT EXISTS idx_schedule_gate_time
        ON schedule_entries (gate_id, start_time, end_time);

      CREATE INDEX IF NOT EXISTS idx_schedule_crew_time
        ON schedule_entries (crew_id, start_time, end_time);
    `,  
  },
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
      // better-sqlite3 exec() supports multiple statements in one call
      db.exec(migration.up);

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
