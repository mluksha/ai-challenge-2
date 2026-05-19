/**
 * resources/runwaysResource.ts
 *
 * MCP Resource: atc://runways
 *
 * Read-only runway usage + overlap validation derived from persisted schedule.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config/env.js";
import { getRunwayUsage } from "../persistence/resourceRepository.js";

export function registerRunwaysResource(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.resource(
    "runways",
    "atc://runways",
    {
      title: "ATC Runways",
      description:
        "Runway availability and usage, including overlap consistency checks.",
      mimeType: "application/json",
    },
    async () => {
      const data = getRunwayUsage(config.airport);

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
            uri: "atc://runways",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );
}
