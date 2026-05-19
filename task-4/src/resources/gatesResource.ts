/**
 * resources/gatesResource.ts
 *
 * MCP Resource: atc://gates
 *
 * Read-only gate availability and occupancy windows (includes turnaround), with
 * overlap validation to ensure no conflicting gate assignments.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config/env.js";
import { getGateUsage } from "../persistence/resourceRepository.js";

export function registerGatesResource(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.resource(
    "gates",
    "atc://gates",
    {
      title: "ATC Gates",
      description:
        "Gate availability and occupancy windows derived from persisted schedule entries.",
      mimeType: "application/json",
    },
    async () => {
      const data = getGateUsage(config.airport);

      const payload = {
        ...data,
        consistency: {
          hasOverlaps: data.overlapViolations.length > 0,
          violationCount: data.overlapViolations.length,
        },
      };

      return {
        contents: [
          {
            uri: "atc://gates",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );
}
