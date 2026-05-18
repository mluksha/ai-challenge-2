/**
 * domain/types.ts
 *
 * All TypeScript domain types for the ATC system.
 * Pure types only — no runtime logic, no imports from other project files.
 *
 * Stages that modify this file: 1 (skeleton), 2 (full model), 4 (AirportConfig)
 */

import type { FlightState, OperationType, Priority } from "./constants.js";

// ── Server ───────────────────────────────────────────────────────────────────

export interface ServerStatus {
  name: string;
  version: string;
  status: "ok";
  dbPath: string;
  /** Seconds since process start */
  uptime: number;
  schemaVersion: number;
}

// ── Airport Configuration ─────────────────────────────────────────────────────

export interface AirportConfig {
  runwayCount: number;
  gateCount: number;
  crewCount: number;
  /** Minimum separation in minutes: arrival → arrival on the same runway */
  sepArrivalArrival: number;
  /** Minimum separation in minutes: departure → departure on the same runway */
  sepDepartureDeparture: number;
  /** Minimum separation in minutes when mixing operation types on the same runway */
  sepMixed: number;
  /** Minimum gate occupancy minutes after an arrival before the gate is free */
  gateTurnaround: number;
  /** Extra buffer minutes added after a dependency's end before a dependent may start */
  dependencyBuffer: number;
  /** Hard limit: max minutes from scheduling time that a flight may be placed */
  scheduleHorizon: number;
}

// ── Flight ────────────────────────────────────────────────────────────────────

/**
 * A flight submitted to the ATC system.
 *
 * Lifecycle:
 *   queued → scheduled  (scheduling engine placed it)
 *   queued → blocked    (scheduling engine could not place it; blockReason is set)
 *   scheduled → completed (manual or external confirmation — future)
 *   any live state → cancelled
 *
 * Persistence notes:
 *   - dependsOn is stored as a comma-separated string in SQLite and parsed to string[] here.
 *   - scheduledTime and blockReason are NULL until the scheduling engine runs.
 *   - preferredRunway is NULL meaning "any runway".
 */
export interface Flight {
  /** UUID v4 — generated at submission */
  id: string;
  flightNumber: string;
  operationType: OperationType;
  priority: Priority;
  state: FlightState;
  /** ISO-8601 wall-clock time assigned by the scheduler; null until scheduled */
  scheduledTime: string | null;
  /** IDs of flights that must complete before this flight can be scheduled */
  dependsOn: string[];
  /** 1-based runway index the submitter prefers; null = no preference */
  preferredRunway: number | null;
  /** Set when state is 'blocked'; describes why the flight could not be scheduled */
  blockReason: string | null;
  /** ISO-8601 — when the flight was first submitted */
  createdAt: string;
  /** ISO-8601 — last mutation timestamp */
  updatedAt: string;
}

/**
 * Subset of Flight fields accepted on submission (Stage 3).
 */
export interface FlightSubmission {
  flightNumber: string;
  operationType: OperationType;
  priority: Priority;
  dependsOn?: string[];
  preferredRunway?: number;
}

// ── Schedule Entry ────────────────────────────────────────────────────────────

/**
 * One scheduled operation produced by the scheduling engine.
 *
 * A ScheduleEntry is created atomically alongside the flight's state transition
 * to 'scheduled'. The schedule is always fully replaced — there are no partial
 * updates to an existing schedule.
 *
 * Resource IDs are 1-based integers in the range [1, count] where count is
 * taken from AirportConfig at the time generateSchedule was called.
 */
export interface ScheduleEntry {
  /** UUID v4 */
  id: string;
  flightId: string;
  /** 1-based runway index */
  runwayId: number;
  /** 1-based gate index (arrivals hold gate for gateTurnaround minutes) */
  gateId: number;
  /** 1-based ground crew team index */
  crewId: number;
  /** ISO-8601 — when the runway operation begins */
  startTime: string;
  /** ISO-8601 — when the runway operation ends (startTime + durationMinutes) */
  endTime: string;
  /** Minutes the flight occupies the runway */
  durationMinutes: number;
  /** ISO-8601 — when this record was written */
  createdAt: string;
}

// ── Resource Availability ─────────────────────────────────────────────────────

/**
 * Describes the availability of a single resource (runway, gate, or crew)
 * across the current schedule. Derived at query time from schedule_entries.
 */
export interface ResourceSlot {
  /** Resource type label */
  resourceType: "runway" | "gate" | "crew";
  /** 1-based resource ID */
  resourceId: number;
  /** ISO-8601 — when the resource becomes busy */
  busyFrom: string;
  /** ISO-8601 — when the resource becomes free */
  busyUntil: string;
  flightId: string;
  flightNumber: string;
}

// ── Timeline Event ────────────────────────────────────────────────────────────

/**
 * A single event in the chronological airport timeline.
 * Combines Flight and ScheduleEntry for human-readable inspection.
 */
export interface TimelineEvent {
  startTime: string;
  endTime: string;
  flightId: string;
  flightNumber: string;
  operationType: OperationType;
  priority: Priority;
  runwayId: number;
  gateId: number;
  crewId: number;
  durationMinutes: number;
}

// ── Airport Status ────────────────────────────────────────────────────────────

/**
 * Top-level airport status snapshot (Stage 8).
 */
export interface AirportStatus {
  generatedAt: string;
  flights: {
    total: number;
    byState: Record<FlightState, number>;
    byOperation: Record<OperationType, number>;
  };
  resources: {
    runways: { total: number; inUse: number };
    gates: { total: number; inUse: number };
    crews: { total: number; inUse: number };
  };
  schedule: {
    hasSchedule: boolean;
    /** ISO-8601 of the last scheduled flight's endTime, or null */
    completionTime: string | null;
  };
  blockedFlights: Array<{ flightId: string; flightNumber: string; reason: string }>;
}

// ── Bottleneck ────────────────────────────────────────────────────────────────

/**
 * Result of getBottleneck (Stage 9).
 */
export interface BottleneckResult {
  chainLength: number;
  totalDurationMinutes: number;
  flights: Array<{
    flightId: string;
    flightNumber: string;
    scheduledTime: string;
    durationMinutes: number;
  }>;
}
