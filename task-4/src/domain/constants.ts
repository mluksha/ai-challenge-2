/**
 * domain/constants.ts
 *
 * Shared enums and literal string types used across all layers.
 * No imports from other project files allowed here.
 *
 * Stages that modify this file: 1, 2, 3, 7
 */

export const FLIGHT_STATES = [
  "queued",
  "scheduled",
  "completed",
  "cancelled",
  "blocked",
] as const;

export type FlightState = (typeof FLIGHT_STATES)[number];

export const OPERATION_TYPES = ["arrival", "departure"] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Numeric weight used for sorting — lower number = higher priority. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export const SERVER_NAME = "atc-mcp-server";
export const SERVER_VERSION = "0.1.0";
