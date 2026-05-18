/**
 * index.ts
 *
 * Entry point for the ATC MCP Server.
 *
 * Startup sequence:
 *   1. Load and validate environment variables (fails fast on bad config)
 *   2. Open SQLite database (creates file + directory if needed)
 *   3. Run pending schema migrations
 *   4. Create and configure the MCP server
 *   5. Connect via stdio transport
 *
 * All errors during startup are logged to stderr and cause a non-zero exit.
 *
 * Stages that modify this file: 1
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/env.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrations.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // ── 1. Config ──────────────────────────────────────────────────────────────
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  console.error(`[startup] DB path: ${config.dbPath}`);

  // ── 2. Database ────────────────────────────────────────────────────────────
  let db;
  try {
    db = openDatabase(config.dbPath);
  } catch (err) {
    console.error(`[startup] Failed to open database: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── 3. Migrations ──────────────────────────────────────────────────────────
  let schemaVersion;
  try {
    schemaVersion = runMigrations(db);
  } catch (err) {
    console.error(`[startup] Migration failed: ${(err as Error).message}`);
    process.exit(1);
  }

  console.error(`[startup] Schema version: ${schemaVersion}`);

  // ── 4. MCP Server ──────────────────────────────────────────────────────────
  const server = createServer(config);

  // ── 5. Transport ───────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[startup] ATC MCP Server running on stdio");
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
