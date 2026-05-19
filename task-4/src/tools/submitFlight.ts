/**
 * tools/submitFlight.ts
 *
 * MCP Tool: submitFlight
 *
 * Accepts a flight plan and persists it immediately in queued state.
 * No scheduling is performed in this tool.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createFlight } from "../persistence/flightRepository.js";
import { OPERATION_TYPES, PRIORITIES } from "../domain/constants.js";
import type { FlightSubmission } from "../domain/types.js";

export function registerSubmitFlight(server: McpServer): void {
  server.tool(
    "submitFlight",
    "Submits a flight plan to the ATC queue and persists it immediately.",
    {
      flightNumber: z
        .string()
        .min(2, "flightNumber must be at least 2 characters")
        .max(20, "flightNumber must be at most 20 characters"),
      operationType: z.enum(OPERATION_TYPES),
      priority: z.enum(PRIORITIES),
      dependencies: z.array(z.string().uuid()).optional(),
      preferredRunway: z.number().int().positive().optional(),
    },
    async (args): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const payload: FlightSubmission = {
        flightNumber: args.flightNumber.trim().toUpperCase(),
        operationType: args.operationType,
        priority: args.priority,
        dependsOn: args.dependencies ?? [],
        preferredRunway: args.preferredRunway,
      };

      const flight = createFlight(payload);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Flight submitted successfully.",
                flight,
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
