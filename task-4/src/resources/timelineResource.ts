/**
 * resources/timelineResource.ts
 *
 * MCP Resource: atc://timeline
 *
 * Chronological read-only view of persisted scheduled operations.
 * Backed fully by SQLite schedule_entries, so it survives process restarts.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getTimelineEvents } from "../persistence/resourceRepository.js";

export function registerTimelineResource(server: McpServer): void {
  server.resource(
    "timeline",
    "atc://timeline",
    {
      title: "ATC Timeline",
      description: "Chronological timeline of scheduled airport operations.",
      mimeType: "application/json",
    },
    async () => {
      const timeline = getTimelineEvents();

      const payload = {
        generatedAt: new Date().toISOString(),
        operationCount: timeline.length,
        timeline,
      };

      return {
        contents: [
          {
            uri: "atc://timeline",
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );
}
