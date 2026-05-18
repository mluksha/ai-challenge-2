/**
 * server.ts
 *
 * MCP server factory.
 * Creates the McpServer instance and registers all tools and resources.
 *
 * Architectural rule:
 *   - This file knows only MCP SDK types and the registration functions.
 *   - It does NOT import domain logic or SQLite directly.
 *   - Each tool/resource registration is delegated to its own module.
 *
 * Stages that modify this file:
 *   - Stage 1: skeleton + getServerStatus
 *   - Stage 3: submitFlight + flightsResource
 *   - Stage 5: generateSchedule
 *   - Stage 6: timeline/runway/gate resources
 *   - Stage 7: cancelFlight
 *   - Stage 8: getAirportStatus
 *   - Stage 9: getBottleneck
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EnvConfig } from "./config/env.js";
import { SERVER_NAME, SERVER_VERSION } from "./domain/constants.js";

// ── Tool registrations ────────────────────────────────────────────────────────
import { registerGetServerStatus } from "./tools/getServerStatus.js";

/**
 * Creates and configures the MCP server.
 * Returns the ready-to-connect server instance.
 */
export function createServer(config: Readonly<EnvConfig>): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // ── Stage 1 tools ─────────────────────────────────────────────────────────
  registerGetServerStatus(server, config);

  // Stage 3: registerSubmitFlight(server, config)
  // Stage 5: registerGenerateSchedule(server, config)
  // Stage 7: registerCancelFlight(server, config)
  // Stage 8: registerGetAirportStatus(server, config)
  // Stage 9: registerGetBottleneck(server, config)

  // ── Stage 3 resources ─────────────────────────────────────────────────────
  // registerFlightsResource(server)

  // ── Stage 6 resources ─────────────────────────────────────────────────────
  // registerTimelineResource(server)
  // registerRunwaysResource(server)
  // registerGatesResource(server)

  return server;
}
