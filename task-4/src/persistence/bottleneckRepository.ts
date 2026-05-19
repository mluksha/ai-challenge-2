/**
 * persistence/bottleneckRepository.ts
 *
 * Read-side aggregation for Stage 9 bottleneck analysis.
 *
 * The bottleneck is defined as the longest active scheduled dependency chain in
 * the current persisted schedule. "Longest" is measured by actual elapsed time
 * from the first flight's scheduled start to the last flight's scheduled end.
 * That elapsed window includes operation durations, dependency buffers, and any
 * additional resource-induced waiting reflected in the persisted schedule.
 */

import { getDb } from "../db/connection.js";
import type { BottleneckResult } from "../domain/types.js";

interface ScheduledFlightRow {
  flight_id: string;
  flight_number: string;
  depends_on: string | null;
  scheduled_time: string;
  end_time: string;
  duration_minutes: number;
}

interface ChainState {
  chain: ScheduledFlightRow[];
  startMs: number;
  endMs: number;
}

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function parseDependsOn(raw: string | null): string[] {
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getScheduledFlights(): ScheduledFlightRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         f.id AS flight_id,
         f.flight_number,
         f.depends_on,
         s.start_time AS scheduled_time,
         s.end_time,
         s.duration_minutes
       FROM flights f
       JOIN schedule_entries s ON s.flight_id = f.id
       WHERE f.state = 'scheduled'
       ORDER BY s.start_time ASC, f.id ASC`
    )
    .all() as ScheduledFlightRow[];
}

function compareChains(a: ChainState, b: ChainState): number {
  const aElapsed = a.endMs - a.startMs;
  const bElapsed = b.endMs - b.startMs;
  if (aElapsed !== bElapsed) {
    return aElapsed - bElapsed;
  }

  if (a.chain.length !== b.chain.length) {
    return a.chain.length - b.chain.length;
  }

  const aKey = a.chain.map((flight) => flight.flight_id).join("|");
  const bKey = b.chain.map((flight) => flight.flight_id).join("|");
  return aKey.localeCompare(bKey);
}

export function buildBottleneckResult(): BottleneckResult {
  const flights = getScheduledFlights();
  if (flights.length === 0) {
    return {
      chainLength: 0,
      totalDurationMinutes: 0,
      flights: [],
    };
  }

  const flightsById = new Map(flights.map((flight) => [flight.flight_id, flight]));
  const bestChainEndingAt = new Map<string, ChainState>();

  for (const flight of flights) {
    const startMs = toMs(flight.scheduled_time);
    const endMs = toMs(flight.end_time);
    const dependencyIds = parseDependsOn(flight.depends_on).filter((depId) => flightsById.has(depId));

    let bestForFlight: ChainState = {
      chain: [flight],
      startMs,
      endMs,
    };

    for (const depId of dependencyIds) {
      const predecessor = bestChainEndingAt.get(depId);
      if (!predecessor) {
        continue;
      }

      const candidate: ChainState = {
        chain: [...predecessor.chain, flight],
        startMs: predecessor.startMs,
        endMs,
      };

      if (compareChains(candidate, bestForFlight) > 0) {
        bestForFlight = candidate;
      }
    }

    bestChainEndingAt.set(flight.flight_id, bestForFlight);
  }

  let bottleneck = bestChainEndingAt.get(flights[0].flight_id)!;
  for (const chain of bestChainEndingAt.values()) {
    if (compareChains(chain, bottleneck) > 0) {
      bottleneck = chain;
    }
  }

  return {
    chainLength: bottleneck.chain.length,
    totalDurationMinutes: Math.round((bottleneck.endMs - bottleneck.startMs) / 60_000),
    flights: bottleneck.chain.map((flight) => ({
      flightId: flight.flight_id,
      flightNumber: flight.flight_number,
      scheduledTime: flight.scheduled_time,
      durationMinutes: flight.duration_minutes,
    })),
  };
}
