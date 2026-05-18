/**
 * domain/types.ts
 *
 * All TypeScript domain types for the ATC system.
 * Pure types only — no runtime logic, no imports from other project files.
 *
 * Stages that modify this file: 1 (skeleton), 2 (full model), 4 (AirportConfig), 5 (ScheduleEntry)
 */

import type { FlightState, OperationType, Priority } from "./constants.js";

// ── Server ───────────────────────────────────────────────────────────────────

export interface ServerStatus {
  name: string;
  version: string;
  status: "ok";
  dbPath: string;
  uptime: number; /** seconds since process start */
  schemaVersion: number;
}

// ── Airport Configuration ─────────────────────────────────────────────────────
// Populated fully in Stage 4. Declared here so other types can reference it.

export interface AirportConfig {
  runwayCount: number;
  gateCount: number;
  crewCount: number;
  /** Minimum separation in minutes: arrival → arrival */
  sepArrivalArrival: number;
  /** Minimum separation in minutes: departure → departure */
  sepDepartureDeparture: number;
  /** Minimum separation in minutes: mixed (arrival→departure or departure→arrival) */
  sepMixed: number;
  /** Minimum gate occupancy minutes after an arrival lands */
  gateTurnaround: number;
  /** Extra buffer minutes after a dependency ends before dependent may start */
  dependencyBuffer: number;
  /** Hard limit: max minutes from now a flight may be scheduled */
  scheduleHorizon: number;
}

// ── Flight ────────────────────────────────────────────────────────────────────

export interface Flight {
  id: string;              /** UUID v4 */
  flightNumber: string;
  operationType: OperationType;
  priority: Priority;
  /** ISO-8601 string or null (set during scheduling) */
  scheduledTime: string | null;
  state: FlightState;
  /** Comma-separated flight IDs this flight depends on, or null */
  dependsOn: string[] | null;
  /** Preferred runway ID (1-based index), or null = any */
  preferredRunway: number | null;
  /** Human-readable reason why the flight is blocked/unscheduled, or null */
  blockReason: string | null;
  createdAt: string;       /** ISO-8601 */
  updatedAt: string;       /** ISO-8601 */
}

// ── Schedule Entry ────────────────────────────────────────────────────────────
// Populated in Stage 5.

export interface ScheduleEntry {
  id: string;              /** UUID v4 */
  flightId: string;
  runwayId: number;        /** 1-based */
  gateId: number;          /** 1-based */
  crewId: number;          /** 1-based */
  startTime: string;       /** ISO-8601 */
  endTime: string;         /** ISO-8601 */
  /** Duration in minutes (operation time on runway) */
  durationMinutes: number;
  createdAt: string;
}
