/**
 * config/env.ts
 *
 * Reads and validates all environment variables.
 * Fails immediately at startup with a clear message if anything is missing or invalid.
 * Returns a frozen AirportConfig object.
 *
 * All airport config variables are REQUIRED (Stage 4).
 *
 * Stages that modify this file: 1 (skeleton), 4 (full airport config, all required)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AirportConfig } from "../domain/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

function readInt(name: string): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `[config] Environment variable ${name} must be a positive integer, got: "${raw}"`
    );
  }
  return parsed;
}

function readPath(name: string, defaultRelative: string): string {
  const raw = process.env[name];
  const rel = raw && raw.trim() !== "" ? raw.trim() : defaultRelative;
  return path.isAbsolute(rel) ? rel : path.resolve(PROJECT_ROOT, rel);
}

export interface EnvConfig {
  dbPath: string;
  airport: AirportConfig;
}

let _config: Readonly<EnvConfig> | null = null;

/**
 * Parses and validates environment variables once.
 * Subsequent calls return the cached result.
 * Throws on invalid / missing values.
 *
 * All airport configuration must be provided via environment variables.
 * Configuration is treated as immutable after load and applied to all schedules
 * generated during this server process. If you change config, restart the server.
 *
 * Note on config changes:
 *   - Config changes do NOT retroactively reschedule existing flights.
 *   - Only flights in 'queued' or 'blocked' state are eligible for re-scheduling.
 *   - On server restart with new config, the next call to generateSchedule will
 *     use the new config and produce a fresh schedule.
 */
export function loadConfig(): Readonly<EnvConfig> {
  if (_config) return _config;

  const dbPath = readPath("ATC_DB_PATH", "./data/atc.db");

  const airport: AirportConfig = Object.freeze({
    runwayCount: readInt("ATC_RUNWAY_COUNT"),
    gateCount: readInt("ATC_GATE_COUNT"),
    crewCount: readInt("ATC_CREW_COUNT"),
    sepArrivalArrival: readInt("ATC_SEP_ARRIVAL_ARRIVAL"),
    sepDepartureDeparture: readInt("ATC_SEP_DEPARTURE_DEPARTURE"),
    sepMixed: readInt("ATC_SEP_MIXED"),
    gateTurnaround: readInt("ATC_GATE_TURNAROUND"),
    dependencyBuffer: readInt("ATC_DEPENDENCY_BUFFER"),
    scheduleHorizon: readInt("ATC_SCHEDULE_HORIZON"),
  });

  _config = Object.freeze({ dbPath, airport });
  return _config;
}
