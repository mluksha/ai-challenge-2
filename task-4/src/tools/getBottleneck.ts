/**
 * tools/getBottleneck.ts
 *
 * MCP Tool: getBottleneck
 *
 * Returns the longest active scheduled dependency chain from persisted state.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildBottleneckResult } from "../persistence/bottleneckRepository.js";

export function registerGetBottleneck(server: McpServer): void {
  server.tool(
    "getBottleneck",
    "Identifies the longest active scheduled dependency chain in the current schedule.",
    {},
    async (): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const result = buildBottleneckResult();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
