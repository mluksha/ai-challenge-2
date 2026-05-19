/**
 * persistence/configRepository.ts
 *
 * Persistence boundary for airport configuration snapshots.
 *
 * Stage 4 responsibilities:
 * - Persist the effective airport configuration at server startup
 * - Retrieve the most recent config snapshot
 * - Track configuration history (for auditing/debugging)
 *
 * Design rationale:
 *   Config snapshots are append-only. Each server start writes a new snapshot.
 *   This allows debugging and reconstructing what config was active when
 *   a flight was scheduled. Config is never updated in-place; it's replaced.
 */

import { getDb } from "../db/connection.js";
import type { AirportConfig } from "../domain/types.js";

interface ConfigSnapshotRow {
  id: string;
  runway_count: number;
  gate_count: number;
  crew_count: number;
  sep_arrival_arrival: number;
  sep_departure_departure: number;
  sep_mixed: number;
  gate_turnaround: number;
  dependency_buffer: number;
  schedule_horizon: number;
  created_at: string;
}

function mapSnapshotRow(row: ConfigSnapshotRow): AirportConfig {
  return {
    runwayCount: row.runway_count,
    gateCount: row.gate_count,
    crewCount: row.crew_count,
    sepArrivalArrival: row.sep_arrival_arrival,
    sepDepartureDeparture: row.sep_departure_departure,
    sepMixed: row.sep_mixed,
    gateTurnaround: row.gate_turnaround,
    dependencyBuffer: row.dependency_buffer,
    scheduleHorizon: row.schedule_horizon,
  };
}

export function persistConfigSnapshot(config: AirportConfig): void {
  const db = getDb();

  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO config_snapshots (
      id,
      runway_count,
      gate_count,
      crew_count,
      sep_arrival_arrival,
      sep_departure_departure,
      sep_mixed,
      gate_turnaround,
      dependency_buffer,
      schedule_horizon
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    config.runwayCount,
    config.gateCount,
    config.crewCount,
    config.sepArrivalArrival,
    config.sepDepartureDeparture,
    config.sepMixed,
    config.gateTurnaround,
    config.dependencyBuffer,
    config.scheduleHorizon
  );

  console.error(
    `[config] Persisted config snapshot: ${id} at ${new Date().toISOString()}`
  );
}

export function getMostRecentConfigSnapshot(): AirportConfig | null {
  const db = getDb();

  const row = db
    .prepare(
      `SELECT * FROM config_snapshots ORDER BY created_at DESC LIMIT 1`
    )
    .get() as ConfigSnapshotRow | undefined;

  return row ? mapSnapshotRow(row) : null;
}
