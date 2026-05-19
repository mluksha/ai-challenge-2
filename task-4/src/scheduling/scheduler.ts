/**
 * scheduling/scheduler.ts
 *
 * Pure deterministic scheduling engine.
 *
 * Determinism strategy:
 * - Input flights are sorted by (priority, createdAt, id)
 * - Time advances in fixed 1-minute steps
 * - Resource selection is always the lowest available ID
 * - For identical inputs and runAt timestamp, output is identical
 *
 * No database calls in this module.
 */

import { PRIORITY_WEIGHT } from "../domain/constants.js";
import type { AirportConfig, Flight, OperationType } from "../domain/types.js";

const MINUTE_MS = 60_000;

const OPERATION_DURATION_MINUTES: Record<OperationType, number> = {
  arrival: 8,
  departure: 6,
};

interface RunwayAllocation {
  startMs: number;
  endMs: number;
  operationType: OperationType;
}

interface TimeAllocation {
  startMs: number;
  endMs: number;
}

export interface ScheduledAssignment {
  flightId: string;
  startTime: string;
  endTime: string;
  runwayId: number;
  gateId: number;
  crewId: number;
  durationMinutes: number;
}

export interface BlockedAssignment {
  flightId: string;
  reason: string;
}

export interface ScheduleComputation {
  runAt: string;
  horizonEnd: string;
  scheduled: ScheduledAssignment[];
  blocked: BlockedAssignment[];
}

function toMs(iso: string): number {
  return new Date(iso).getTime();
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function sortFlightsDeterministically(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (byPriority !== 0) return byPriority;

    const byCreated = a.createdAt.localeCompare(b.createdAt);
    if (byCreated !== 0) return byCreated;

    return a.id.localeCompare(b.id);
  });
}

function getRunwaySeparationMinutes(
  previous: OperationType,
  next: OperationType,
  config: AirportConfig
): number {
  if (previous === "arrival" && next === "arrival") return config.sepArrivalArrival;
  if (previous === "departure" && next === "departure") {
    return config.sepDepartureDeparture;
  }
  return config.sepMixed;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isGateFree(
  gateAllocations: TimeAllocation[],
  startMs: number,
  gateEndMs: number
): boolean {
  return !gateAllocations.some((a) => overlaps(startMs, gateEndMs, a.startMs, a.endMs));
}

function isCrewFree(
  crewAllocations: TimeAllocation[],
  startMs: number,
  endMs: number
): boolean {
  return !crewAllocations.some((a) => overlaps(startMs, endMs, a.startMs, a.endMs));
}

function getRunwayConflictAdvance(
  allocations: RunwayAllocation[],
  candidateStartMs: number,
  candidateEndMs: number,
  candidateType: OperationType,
  config: AirportConfig
): number | null {
  let requiredStartMs = candidateStartMs;

  for (const existing of allocations) {
    const sepExistingToCandidate =
      getRunwaySeparationMinutes(existing.operationType, candidateType, config) * MINUTE_MS;
    const sepCandidateToExisting =
      getRunwaySeparationMinutes(candidateType, existing.operationType, config) * MINUTE_MS;

    const candidateMayStartAfter = existing.endMs + sepExistingToCandidate;
    const existingMayStartAfterCandidate = candidateEndMs + sepCandidateToExisting;

    const noConflict =
      candidateStartMs >= candidateMayStartAfter || existing.startMs >= existingMayStartAfterCandidate;

    if (!noConflict && candidateMayStartAfter > requiredStartMs) {
      requiredStartMs = candidateMayStartAfter;
    }
  }

  if (requiredStartMs === candidateStartMs) return null;
  return requiredStartMs;
}

function chooseFirstFreeResource(
  allocationsById: Array<TimeAllocation[]>,
  startMs: number,
  endMs: number,
  checker: (allocs: TimeAllocation[], start: number, end: number) => boolean
): number | null {
  for (let resourceId = 1; resourceId < allocationsById.length; resourceId += 1) {
    if (checker(allocationsById[resourceId], startMs, endMs)) {
      return resourceId;
    }
  }
  return null;
}

function findSlot(
  flight: Flight,
  earliestStartMs: number,
  runAtMs: number,
  horizonEndMs: number,
  runwayAllocations: Array<RunwayAllocation[]>,
  gateAllocations: Array<TimeAllocation[]>,
  crewAllocations: Array<TimeAllocation[]>,
  config: AirportConfig
): {
  runwayId: number;
  gateId: number;
  crewId: number;
  startMs: number;
  endMs: number;
  durationMinutes: number;
} | null {
  const durationMinutes = OPERATION_DURATION_MINUTES[flight.operationType];
  const durationMs = durationMinutes * MINUTE_MS;

  const allowedRunways: number[] = [];
  if (flight.preferredRunway !== null) {
    if (flight.preferredRunway < 1 || flight.preferredRunway > config.runwayCount) {
      return null;
    }
    allowedRunways.push(flight.preferredRunway);
  } else {
    for (let runwayId = 1; runwayId <= config.runwayCount; runwayId += 1) {
      allowedRunways.push(runwayId);
    }
  }

  let candidateStartMs = Math.max(earliestStartMs, runAtMs);
  candidateStartMs = Math.ceil(candidateStartMs / MINUTE_MS) * MINUTE_MS;

  while (candidateStartMs <= horizonEndMs) {
    const candidateEndMs = candidateStartMs + durationMs;
    if (candidateEndMs > horizonEndMs) {
      return null;
    }

    let bestCandidate:
      | {
          runwayId: number;
          gateId: number;
          crewId: number;
          startMs: number;
          endMs: number;
          durationMinutes: number;
        }
      | null = null;

    let nextRunwayAdvanceMs = candidateStartMs + MINUTE_MS;

    for (const runwayId of allowedRunways) {
      const runwayConflicts = runwayAllocations[runwayId];
      const advanceTo = getRunwayConflictAdvance(
        runwayConflicts,
        candidateStartMs,
        candidateEndMs,
        flight.operationType,
        config
      );

      if (advanceTo !== null) {
        if (advanceTo < nextRunwayAdvanceMs || nextRunwayAdvanceMs === candidateStartMs + MINUTE_MS) {
          nextRunwayAdvanceMs = advanceTo;
        }
        continue;
      }

      const gateBusyEndMs = candidateEndMs + config.gateTurnaround * MINUTE_MS;
      const gateId = chooseFirstFreeResource(
        gateAllocations,
        candidateStartMs,
        gateBusyEndMs,
        isGateFree
      );
      if (gateId === null) continue;

      const crewId = chooseFirstFreeResource(
        crewAllocations,
        candidateStartMs,
        candidateEndMs,
        isCrewFree
      );
      if (crewId === null) continue;

      bestCandidate = {
        runwayId,
        gateId,
        crewId,
        startMs: candidateStartMs,
        endMs: candidateEndMs,
        durationMinutes,
      };
      break;
    }

    if (bestCandidate) {
      return bestCandidate;
    }

    candidateStartMs = Math.max(nextRunwayAdvanceMs, candidateStartMs + MINUTE_MS);
  }

  return null;
}

export function computeSchedule(
  flights: Flight[],
  config: AirportConfig,
  runAt: string
): ScheduleComputation {
  const runAtMs = toMs(runAt);
  const horizonEndMs = runAtMs + config.scheduleHorizon * MINUTE_MS;

  const activeFlights = flights.filter(
    (f) => f.state === "queued" || f.state === "blocked" || f.state === "scheduled"
  );
  const orderedFlights = sortFlightsDeterministically(activeFlights);

  const flightsById = new Map<string, Flight>();
  for (const flight of orderedFlights) {
    flightsById.set(flight.id, flight);
  }

  const runwayAllocations: Array<RunwayAllocation[]> = Array.from(
    { length: config.runwayCount + 1 },
    () => []
  );
  const gateAllocations: Array<TimeAllocation[]> = Array.from(
    { length: config.gateCount + 1 },
    () => []
  );
  const crewAllocations: Array<TimeAllocation[]> = Array.from(
    { length: config.crewCount + 1 },
    () => []
  );

  const scheduledByFlightId = new Map<string, ScheduledAssignment>();
  const blockedByFlightId = new Map<string, string>();

  const pendingIds = new Set(orderedFlights.map((f) => f.id));

  let progressed = true;
  while (pendingIds.size > 0 && progressed) {
    progressed = false;

    for (const flight of orderedFlights) {
      if (!pendingIds.has(flight.id)) continue;

      if (flight.preferredRunway !== null) {
        if (flight.preferredRunway < 1 || flight.preferredRunway > config.runwayCount) {
          blockedByFlightId.set(flight.id, "No suitable runway: preferred runway is out of range");
          pendingIds.delete(flight.id);
          progressed = true;
          continue;
        }
      }

      let earliestStartMs = runAtMs;
      let waitingOnDependency = false;
      let dependencyError: string | null = null;

      for (const depId of flight.dependsOn) {
        const depFlight = flightsById.get(depId);
        if (!depFlight) {
          dependencyError = `Blocked: dependency ${depId} not found among schedulable flights`;
          break;
        }

        const depScheduled = scheduledByFlightId.get(depId);
        if (!depScheduled) {
          if (pendingIds.has(depId)) {
            waitingOnDependency = true;
            break;
          }

          const depBlockedReason = blockedByFlightId.get(depId);
          dependencyError = depBlockedReason
            ? `Blocked by dependency ${depId}: ${depBlockedReason}`
            : `Blocked: dependency ${depId} is not scheduled`;
          break;
        }

        const depReadyMs =
          toMs(depScheduled.endTime) + config.dependencyBuffer * MINUTE_MS;
        if (depReadyMs > earliestStartMs) {
          earliestStartMs = depReadyMs;
        }
      }

      if (dependencyError) {
        blockedByFlightId.set(flight.id, dependencyError);
        pendingIds.delete(flight.id);
        progressed = true;
        continue;
      }

      if (waitingOnDependency) {
        continue;
      }

      if (earliestStartMs > horizonEndMs) {
        blockedByFlightId.set(flight.id, "Horizon exceeded before flight became dependency-ready");
        pendingIds.delete(flight.id);
        progressed = true;
        continue;
      }

      const slot = findSlot(
        flight,
        earliestStartMs,
        runAtMs,
        horizonEndMs,
        runwayAllocations,
        gateAllocations,
        crewAllocations,
        config
      );

      if (!slot) {
        blockedByFlightId.set(
          flight.id,
          "No feasible slot within scheduling horizon under runway/gate/crew constraints"
        );
        pendingIds.delete(flight.id);
        progressed = true;
        continue;
      }

      runwayAllocations[slot.runwayId].push({
        startMs: slot.startMs,
        endMs: slot.endMs,
        operationType: flight.operationType,
      });
      gateAllocations[slot.gateId].push({
        startMs: slot.startMs,
        endMs: slot.endMs + config.gateTurnaround * MINUTE_MS,
      });
      crewAllocations[slot.crewId].push({
        startMs: slot.startMs,
        endMs: slot.endMs,
      });

      const assignment: ScheduledAssignment = {
        flightId: flight.id,
        startTime: toIso(slot.startMs),
        endTime: toIso(slot.endMs),
        runwayId: slot.runwayId,
        gateId: slot.gateId,
        crewId: slot.crewId,
        durationMinutes: slot.durationMinutes,
      };

      scheduledByFlightId.set(flight.id, assignment);
      pendingIds.delete(flight.id);
      progressed = true;
    }
  }

  if (pendingIds.size > 0) {
    for (const flightId of pendingIds) {
      blockedByFlightId.set(
        flightId,
        "Dependency cycle or unresolved dependency chain prevented scheduling"
      );
    }
  }

  const scheduled: ScheduledAssignment[] = orderedFlights
    .map((f) => scheduledByFlightId.get(f.id))
    .filter((v): v is ScheduledAssignment => Boolean(v));

  const blocked: BlockedAssignment[] = orderedFlights
    .filter((f) => !scheduledByFlightId.has(f.id))
    .map((f) => ({
      flightId: f.id,
      reason: blockedByFlightId.get(f.id) ?? "No feasible slot",
    }));

  return {
    runAt,
    horizonEnd: toIso(horizonEndMs),
    scheduled,
    blocked,
  };
}
