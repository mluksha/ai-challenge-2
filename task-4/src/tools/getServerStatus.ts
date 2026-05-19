/**
 * tools/getServerStatus.ts
 *
 * MCP Tool: getServerStatus
 *
 * Returns runtime information about the ATC MCP server:
 *   - server name and version
 *   - database path
 *   - process uptime in seconds
 *   - current schema version
 *
 * This is a read-only, side-effect-free tool.
 * It is the first tool registered and acts as a liveness probe.
 *
 * Stages that modify this file: 1
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "../config/env.js";
import { getSchemaVersion } from "../db/migrations.js";
import { getDb } from "../db/connection.js";
import { SERVER_NAME, SERVER_VERSION } from "../domain/constants.js";
import type { ServerStatus } from "../domain/types.js";

const startTime = Date.now();

export function registerGetServerStatus(
  server: McpServer,
  config: Readonly<EnvConfig>
): void {
  server.tool(
    "getServerStatus",
    "Returns the current status of the ATC MCP server including version, uptime, database path, and schema version.",
    {}, // No input parameters
    async (): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const db = getDb();
      const schemaVersion = getSchemaVersion(db);

      const status: ServerStatus = {
        name: SERVER_NAME,
        version: SERVER_VERSION,
        status: "ok",
        dbPath: config.dbPath,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        schemaVersion,
      };

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
