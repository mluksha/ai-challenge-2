/**
 * resources/flightsResource.ts
 *
 * MCP Resource: atc://flights
 *
 * Read-only inspection view of all persisted flights with state and reason fields
 * for unscheduled / cancelled / blocked scenarios.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listFlights } from "../persistence/flightRepository.js";

function deriveReason(state: string, blockReason: string | null): string | null {
  if (state === "blocked") {
    return blockReason ?? "Blocked by scheduler constraints";
  }
  if (state === "cancelled") {
    return "Cancelled";
  }
  if (state === "queued") {
    return "Not yet scheduled";
  }
  return null;
}

export function registerFlightsResource(server: McpServer): void {
  server.resource(
    "flights",
    "atc://flights",
    {
      title: "ATC Flights",
      description:
        "Read-only list of all flights with current state and unscheduled/cancelled/blocked reasons.",
      mimeType: "application/json",
    },
    async () => {
      const flights = listFlights();

      const payload = {
        total: flights.length,
        flights: flights.map((flight) => ({
          id: flight.id,
          flightNumber: flight.flightNumber,
          operationType: flight.operationType,
          priority: flight.priority,
          state: flight.state,
          scheduledTime: flight.scheduledTime,
          dependencies: flight.dependsOn,
          preferredRunway: flight.preferredRunway,
          reason: deriveReason(flight.state, flight.blockReason),
          createdAt: flight.createdAt,
          updatedAt: flight.updatedAt,
        })),
      };

      return {
        contents: [
          {
            uri: "atc://flights",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );
}
