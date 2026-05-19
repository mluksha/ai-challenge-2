/**
 * tools/cancelFlight.ts
 *
 * MCP Tool: cancelFlight
 *
 * Cancels a persisted flight and immediately re-evaluates dependent flights
 * by recomputing the full schedule inside the same database transaction.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EnvConfig } from "../config/env.js";
import { getDb } from "../db/connection.js";
import {
  getFlightByNumber,
  listFlightsForScheduling,
} from "../persistence/flightRepository.js";
import { applyScheduleReplacement } from "../persistence/scheduleRepository.js";
import { computeSchedule } from "../scheduling/scheduler.js";

function nowIso(): string {
  return new Date().toISOString();
}

export function registerCancelFlight(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.tool(
    "cancelFlight",
    "Cancels a flight and re-evaluates all dependent flights with a fresh schedule.",
    {
      flight_number: z.string().min(1).max(20),
      reason: z.string().max(200).optional(),
    },
    async (args): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const db = getDb();
      const timestamp = nowIso();
      const cancellationReason =
        args.reason?.trim() || "Cancelled by user request";

      const result = db.transaction(() => {
        const current = getFlightByNumber(args.flight_number.trim().toUpperCase());

        if (!current) {
          throw new Error(
            `[cancelFlight] Flight not found for flight_number: ${args.flight_number}`
          );
        }

        if (current.state === "completed") {
          throw new Error(
            `[cancelFlight] Flight ${current.flightNumber} is completed and cannot be cancelled.`
          );
        }

        if (current.state !== "cancelled") {
          db.prepare(
            `UPDATE flights
             SET state = 'cancelled', scheduled_time = NULL, block_reason = ?, updated_at = ?
             WHERE id = ?`
          ).run(cancellationReason, timestamp, current.id);
        }

        const flights = listFlightsForScheduling();
        const computed = computeSchedule(flights, config.airport, timestamp);
        const scheduleResult = applyScheduleReplacement(db, computed.scheduled, computed.blocked);

        return {
          cancelledFlightId: current.id,
          cancelledFlightNumber: current.flightNumber,
          cancellationReason,
          scheduledCount: scheduleResult.scheduledCount,
          blockedCount: scheduleResult.blockedCount,
          blockedFlights: computed.blocked,
        };
      })();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Flight cancelled and schedule re-evaluated.",
                ...result,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
