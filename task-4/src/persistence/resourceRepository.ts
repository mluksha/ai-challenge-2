/**
 * persistence/resourceRepository.ts
 *
 * Read-side persistence for Stage 6 resources.
 *
 * All functions are read-only and derive inspection payloads from persisted
 * schedule_entries + flights. No mutation is performed in this module.
 */

import { getDb } from "../db/connection.js";
import { getMostRecentConfigSnapshot } from "./configRepository.js";
import type { AirportConfig, TimelineEvent } from "../domain/types.js";

interface ScheduleJoinRow {
  flight_id: string;
  flight_number: string;
  operation_type: "arrival" | "departure";
  priority: "high" | "medium" | "low";
  runway_id: number;
  gate_id: number;
  crew_id: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface OverlapViolation {
  resourceId: number;
  previousFlightId: string;
  previousEnd: string;
  currentFlightId: string;
  currentStart: string;
}

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function addMinutes(iso: string, minutes: number): string {
  return new Date(toMs(iso) + minutes * 60_000).toISOString();
}

function getScheduleRows(): ScheduleJoinRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         s.flight_id,
         f.flight_number,
         f.operation_type,
         f.priority,
         s.runway_id,
         s.gate_id,
         s.crew_id,
         s.start_time,
         s.end_time,
         s.duration_minutes
       FROM schedule_entries s
       JOIN flights f ON f.id = s.flight_id
       ORDER BY s.start_time ASC, s.flight_id ASC`
    )
    .all() as ScheduleJoinRow[];
}

function detectOverlapsByResource(
  rows: Array<{ resourceId: number; flightId: string; start: string; end: string }>
): OverlapViolation[] {
  const grouped = new Map<number, Array<{ flightId: string; start: string; end: string }>>();

  for (const row of rows) {
    const bucket = grouped.get(row.resourceId) ?? [];
    bucket.push({ flightId: row.flightId, start: row.start, end: row.end });
    grouped.set(row.resourceId, bucket);
  }

  const violations: OverlapViolation[] = [];

  for (const [resourceId, items] of grouped.entries()) {
    items.sort((a, b) => {
      const byStart = a.start.localeCompare(b.start);
      if (byStart !== 0) return byStart;
      return a.flightId.localeCompare(b.flightId);
    });

    for (let i = 1; i < items.length; i += 1) {
      const previous = items[i - 1];
      const current = items[i];
      if (toMs(current.start) < toMs(previous.end)) {
        violations.push({
          resourceId,
          previousFlightId: previous.flightId,
          previousEnd: previous.end,
          currentFlightId: current.flightId,
          currentStart: current.start,
        });
      }
    }
  }

  return violations;
}

export function getTimelineEvents(): TimelineEvent[] {
  const rows = getScheduleRows();
  return rows.map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
    flightId: row.flight_id,
    flightNumber: row.flight_number,
    operationType: row.operation_type,
    priority: row.priority,
    runwayId: row.runway_id,
    gateId: row.gate_id,
    crewId: row.crew_id,
    durationMinutes: row.duration_minutes,
  }));
}

export function getRunwayUsage(config: AirportConfig): {
  generatedAt: string;
  runways: Array<{
    runwayId: number;
    operationCount: number;
    operations: Array<{
      flightId: string;
      flightNumber: string;
      operationType: "arrival" | "departure";
      startTime: string;
      endTime: string;
      durationMinutes: number;
      gateId: number;
      crewId: number;
    }>;
  }>;
  overlapViolations: OverlapViolation[];
} {
  const rows = getScheduleRows();
  const runways = Array.from({ length: config.runwayCount }, (_, i) => i + 1).map((runwayId) => {
    const operations = rows
      .filter((r) => r.runway_id === runwayId)
      .map((r) => ({
        flightId: r.flight_id,
        flightNumber: r.flight_number,
        operationType: r.operation_type,
        startTime: r.start_time,
        endTime: r.end_time,
        durationMinutes: r.duration_minutes,
        gateId: r.gate_id,
        crewId: r.crew_id,
      }));

    return {
      runwayId,
      operationCount: operations.length,
      operations,
    };
  });

  const overlapViolations = detectOverlapsByResource(
    rows.map((r) => ({
      resourceId: r.runway_id,
      flightId: r.flight_id,
      start: r.start_time,
      end: r.end_time,
    }))
  );

  return {
    generatedAt: new Date().toISOString(),
    runways,
    overlapViolations,
  };
}

export function getGateUsage(config: AirportConfig): {
  generatedAt: string;
  gateTurnaroundMinutes: number;
  gates: Array<{
    gateId: number;
    operationCount: number;
    occupancies: Array<{
      flightId: string;
      flightNumber: string;
      operationType: "arrival" | "departure";
      occupiedFrom: string;
      occupiedUntil: string;
      runwayId: number;
      crewId: number;
    }>;
  }>;
  overlapViolations: OverlapViolation[];
} {
  const rows = getScheduleRows();
  const latestConfig = getMostRecentConfigSnapshot();
  const gateTurnaroundMinutes = latestConfig?.gateTurnaround ?? config.gateTurnaround;

  const occupancyRows = rows.map((r) => ({
    gateId: r.gate_id,
    flightId: r.flight_id,
    flightNumber: r.flight_number,
    operationType: r.operation_type,
    occupiedFrom: r.start_time,
    occupiedUntil: addMinutes(r.end_time, gateTurnaroundMinutes),
    runwayId: r.runway_id,
    crewId: r.crew_id,
  }));

  const gates = Array.from({ length: config.gateCount }, (_, i) => i + 1).map((gateId) => {
    const occupancies = occupancyRows.filter((r) => r.gateId === gateId);
    return {
      gateId,
      operationCount: occupancies.length,
      occupancies,
    };
  });

  const overlapViolations = detectOverlapsByResource(
    occupancyRows.map((r) => ({
      resourceId: r.gateId,
      flightId: r.flightId,
      start: r.occupiedFrom,
      end: r.occupiedUntil,
    }))
  );

  return {
    generatedAt: new Date().toISOString(),
    gateTurnaroundMinutes,
    gates,
    overlapViolations,
  };
}
