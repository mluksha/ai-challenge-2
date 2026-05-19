/**
 * persistence/airportStatusRepository.ts
 *
 * Read-side aggregation for Stage 8 airport status reporting.
 *
 * The status payload is derived entirely from persisted flights and schedules.
 * No mutation occurs in this module.
 */

import { getDb } from "../db/connection.js";
import type {
  AirportConfig,
  AirportStatus,
  FlightState,
  OperationType,
} from "../domain/types.js";

interface FlightRow {
  id: string;
  flight_number: string;
  operation_type: OperationType;
  state: FlightState;
  scheduled_time: string | null;
  block_reason: string | null;
}

interface ScheduleRow {
  runway_id: number;
  gate_id: number;
  crew_id: number;
  end_time: string;
}

function getFlights(): FlightRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, flight_number, operation_type, state, scheduled_time, block_reason
       FROM flights
       ORDER BY created_at ASC, id ASC`
    )
    .all() as FlightRow[];
}

function getScheduleRows(): ScheduleRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT runway_id, gate_id, crew_id, end_time
       FROM schedule_entries
       ORDER BY start_time ASC, flight_id ASC`
    )
    .all() as ScheduleRow[];
}

function toCountMap<T extends string>(values: T[], initial: Record<T, number>): Record<T, number> {
  const result = { ...initial };
  for (const value of values) {
    result[value] += 1;
  }
  return result;
}

function getMaxCompletionTime(rows: ScheduleRow[]): string | null {
  if (rows.length === 0) return null;
  return rows.reduce((latest, row) => (row.end_time > latest ? row.end_time : latest), rows[0].end_time);
}

function countDistinctBusyResourceIds(rows: ScheduleRow[], key: "runway_id" | "gate_id" | "crew_id"): number {
  return new Set(rows.map((row) => row[key])).size;
}

function getMostLoadedResourceIds(
  rows: ScheduleRow[],
  key: "runway_id" | "gate_id" | "crew_id",
  total: number
): number[] {
  if (rows.length === 0) return [];

  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row[key], (counts.get(row[key]) ?? 0) + 1);
  }

  let highest = 0;
  for (const count of counts.values()) {
    highest = Math.max(highest, count);
  }

  if (highest === 0) return [];

  const ids = Array.from({ length: total }, (_, i) => i + 1).filter(
    (id) => (counts.get(id) ?? 0) === highest
  );

  return ids;
}

export function buildAirportStatus(config: AirportConfig): AirportStatus {
  const flights = getFlights();
  const scheduleRows = getScheduleRows();

  const byState = toCountMap(
    flights.map((flight) => flight.state),
    {
      queued: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      blocked: 0,
    }
  );

  const byOperation = toCountMap(
    flights.map((flight) => flight.operation_type),
    {
      arrival: 0,
      departure: 0,
    }
  );

  const runwaysInUse = countDistinctBusyResourceIds(scheduleRows, "runway_id");
  const gatesInUse = countDistinctBusyResourceIds(scheduleRows, "gate_id");
  const crewsInUse = countDistinctBusyResourceIds(scheduleRows, "crew_id");

  const blockedFlights = flights
    .filter((flight) => flight.state === "blocked" || flight.state === "queued")
    .map((flight) => ({
      flightId: flight.id,
      flightNumber: flight.flight_number,
      reason:
        flight.block_reason ??
        (flight.state === "queued" ? "Not yet scheduled" : "Blocked by scheduler constraints"),
    }));

  const completionTime = getMaxCompletionTime(scheduleRows);

  const constrainedResources = {
    runways: getMostLoadedResourceIds(scheduleRows, "runway_id", config.runwayCount),
    gates: getMostLoadedResourceIds(scheduleRows, "gate_id", config.gateCount),
    crews: getMostLoadedResourceIds(scheduleRows, "crew_id", config.crewCount),
  };

  return {
    generatedAt: new Date().toISOString(),
    flights: {
      total: flights.length,
      byState,
      byOperation,
    },
    resources: {
      runways: { total: config.runwayCount, inUse: runwaysInUse },
      gates: { total: config.gateCount, inUse: gatesInUse },
      crews: { total: config.crewCount, inUse: crewsInUse },
    },
    schedule: {
      hasSchedule: scheduleRows.length > 0,
      completionTime,
    },
    blockedFlights,
    constrainedResources,
  };
}
