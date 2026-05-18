/**
 * tools/generateSchedule.ts
 *
 * MCP Tool: generateSchedule
 *
 * Generates a deterministic full schedule from persisted flights and replaces
 * the current schedule atomically.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config/env.js";
import { listFlightsForScheduling } from "../persistence/flightRepository.js";
import { replaceSchedule } from "../persistence/scheduleRepository.js";
import { computeSchedule } from "../scheduling/scheduler.js";

export function registerGenerateSchedule(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.tool(
    "generateSchedule",
    "Generates a deterministic full airport schedule and replaces any existing schedule.",
    {},
    async (): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const runAt = new Date().toISOString();
      const flights = listFlightsForScheduling();

      const computed = computeSchedule(flights, config.airport, runAt);
      const writeResult = replaceSchedule(computed.scheduled, computed.blocked);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Schedule generated and persisted.",
                runAt: computed.runAt,
                horizonEnd: computed.horizonEnd,
                flightsConsidered: flights.length,
                scheduledCount: writeResult.scheduledCount,
                blockedCount: writeResult.blockedCount,
                blockedFlights: computed.blocked,
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
