/**
 * config/env.ts
 *
 * Reads and validates all environment variables.
 * Fails immediately at startup with a clear message if anything is missing or invalid.
 * Returns a frozen AirportConfig object.
 *
 * Stages that modify this file: 1 (dbPath only), 4 (full airport config)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AirportConfig } from "../domain/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

function readInt(name: string, defaultValue?: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    if (defaultValue !== undefined) return defaultValue;
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
 */
export function loadConfig(): Readonly<EnvConfig> {
  if (_config) return _config;

  const dbPath = readPath("ATC_DB_PATH", "./data/atc.db");

  // Stage 4 will make these truly mandatory.
  // For Stage 1 we provide safe defaults so the server starts without a .env file.
  const airport: AirportConfig = Object.freeze({
    runwayCount: readInt("ATC_RUNWAY_COUNT", 2),
    gateCount: readInt("ATC_GATE_COUNT", 10),
    crewCount: readInt("ATC_CREW_COUNT", 4),
    sepArrivalArrival: readInt("ATC_SEP_ARRIVAL_ARRIVAL", 3),
    sepDepartureDeparture: readInt("ATC_SEP_DEPARTURE_DEPARTURE", 2),
    sepMixed: readInt("ATC_SEP_MIXED", 5),
    gateTurnaround: readInt("ATC_GATE_TURNAROUND", 30),
    dependencyBuffer: readInt("ATC_DEPENDENCY_BUFFER", 10),
    scheduleHorizon: readInt("ATC_SCHEDULE_HORIZON", 480),
  });

  _config = Object.freeze({ dbPath, airport });
  return _config;
}
