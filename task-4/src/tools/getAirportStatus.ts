/**
 * tools/getAirportStatus.ts
 *
 * MCP Tool: getAirportStatus
 *
 * Returns a structured airport status snapshot derived from persisted state.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config/env.js";
import { buildAirportStatus } from "../persistence/airportStatusRepository.js";

export function registerGetAirportStatus(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.tool(
    "getAirportStatus",
    "Returns a structured airport status report derived from persisted airport state.",
    {},
    async (): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const status = buildAirportStatus(config.airport);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
  );
}
