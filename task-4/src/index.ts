/**
 * index.ts
 *
 * Entry point for the ATC MCP Server.
 *
 * Startup sequence:
 *   0. Load .env file (if present) into process.env
 *   1. Load and validate environment variables (fails fast on bad config)
 *   2. Open SQLite database (creates file + directory if needed)
 *   3. Run pending schema migrations
 *   4. Persist the effective airport configuration snapshot
 *   5. Create and configure the MCP server
 *   6. Connect via stdio transport
 *
 * All errors during startup are logged to stderr and cause a non-zero exit.
 *
 * Stages that modify this file: 1, 4 (config persistence)
 */

import "dotenv/config.js";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/env.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrations.js";
import { persistConfigSnapshot } from "./persistence/configRepository.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  // ── 1. Config (fail immediately if invalid) ─────────────────────────────────
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  console.error(`[startup] Airport Config:`);
  console.error(`  runways: ${config.airport.runwayCount}`);
  console.error(`  gates: ${config.airport.gateCount}`);
  console.error(`  crews: ${config.airport.crewCount}`);
  console.error(`  sep (arr→arr): ${config.airport.sepArrivalArrival}m`);
  console.error(`  sep (dep→dep): ${config.airport.sepDepartureDeparture}m`);
  console.error(`  sep (mixed): ${config.airport.sepMixed}m`);
  console.error(`  gate turnaround: ${config.airport.gateTurnaround}m`);
  console.error(`  dependency buffer: ${config.airport.dependencyBuffer}m`);
  console.error(`  schedule horizon: ${config.airport.scheduleHorizon}m`);
  console.error(`  DB path: ${config.dbPath}`);

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

  // ── 4. Config Snapshot ─────────────────────────────────────────────────────
  try {
    persistConfigSnapshot(config.airport);
  } catch (err) {
    console.error(`[startup] Failed to persist config: ${(err as Error).message}`);
    process.exit(1);
  }

  // ── 5. MCP Server ──────────────────────────────────────────────────────────
  const server = createServer(config);

  // ── 6. Transport ───────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[startup] ATC MCP Server running on stdio");
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});

