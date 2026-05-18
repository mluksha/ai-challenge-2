/**
 * persistence/flightRepository.ts
 *
 * Persistence boundary for the flights table.
 *
 * Stage 3 responsibilities:
 * - Insert submitted flights immediately and atomically
 * - List flights for read-only inspection resource
 * - Map SQLite row format <-> domain format
 */

import { getDb } from "../db/connection.js";
import type { Flight, FlightSubmission } from "../domain/types.js";

interface FlightRow {
  id: string;
  flight_number: string;
  operation_type: "arrival" | "departure";
  priority: "high" | "medium" | "low";
  state: "queued" | "scheduled" | "completed" | "cancelled" | "blocked";
  scheduled_time: string | null;
  depends_on: string | null;
  preferred_runway: number | null;
  block_reason: string | null;
  created_at: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseDependsOn(raw: string | null): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function serializeDependsOn(values: string[] | undefined): string | null {
  if (!values || values.length === 0) return null;
  return values.join(",");
}

function mapFlightRow(row: FlightRow): Flight {
  return {
    id: row.id,
    flightNumber: row.flight_number,
    operationType: row.operation_type,
    priority: row.priority,
    state: row.state,
    scheduledTime: row.scheduled_time,
    dependsOn: parseDependsOn(row.depends_on),
    preferredRunway: row.preferred_runway,
    blockReason: row.block_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createFlight(input: FlightSubmission): Flight {
  const db = getDb();

  const id = crypto.randomUUID();
  const timestamp = nowIso();

  const insert = db.prepare(`
    INSERT INTO flights (
      id,
      flight_number,
      operation_type,
      priority,
      state,
      scheduled_time,
      depends_on,
      preferred_runway,
      block_reason,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, 'queued', NULL, ?, ?, NULL, ?, ?)
  `);

  const tx = db.transaction(() => {
    insert.run(
      id,
      input.flightNumber,
      input.operationType,
      input.priority,
      serializeDependsOn(input.dependsOn),
      input.preferredRunway ?? null,
      timestamp,
      timestamp
    );

    const row = db
      .prepare("SELECT * FROM flights WHERE id = ?")
      .get(id) as FlightRow | undefined;

    if (!row) {
      throw new Error("[persistence] Failed to load inserted flight row.");
    }

    return mapFlightRow(row);
  });

  return tx();
}

export function listFlights(): Flight[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM flights ORDER BY created_at ASC, id ASC")
    .all() as FlightRow[];

  return rows.map(mapFlightRow);
}

/**
 * Returns flights eligible for schedule computation.
 *
 * Full replacement scheduling includes:
 * - queued flights
 * - blocked flights (retry)
 * - currently scheduled flights (recomputed in each run)
 *
 * Cancelled/completed flights are intentionally excluded.
 */
export function listFlightsForScheduling(): Flight[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM flights
       WHERE state IN ('queued','blocked','scheduled')
       ORDER BY created_at ASC, id ASC`
    )
    .all() as FlightRow[];

  return rows.map(mapFlightRow);
}
