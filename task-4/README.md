# Air Traffic Control MCP Server (Task 4)

This project is a TypeScript MCP server (stdio transport) for airport scheduling.
It persists all state in SQLite and exposes:

- MCP tools for mutations/actions
- MCP resources for read-only inspection

No authentication is required.

## 1) Install dependencies and build

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+ (recommended)

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Optional dev watch build

```bash
npm run dev
```

### Run compiled server directly

```bash
npm run start
```

The server runs over stdio (`node dist/index.js`).

## 2) Environment variables and accepted values

Create `.env` in project root. You can start from `.env.example`:

```bash
cp .env.example .env
```

All variables below are required (except the DB path can use default if omitted, but set it explicitly for clarity).

| Variable | Meaning | Accepted values |
|---|---|---|
| `ATC_DB_PATH` | SQLite file path | Any valid file path. Relative paths are resolved from project root. Example: `./data/atc.db` |
| `ATC_RUNWAY_COUNT` | Number of runways | Positive integer (`>= 1`) |
| `ATC_GATE_COUNT` | Number of gates | Positive integer (`>= 1`) |
| `ATC_CREW_COUNT` | Number of ground crews | Positive integer (`>= 1`) |
| `ATC_SEP_ARRIVAL_ARRIVAL` | Arrival-to-arrival runway separation (minutes) | Positive integer (`>= 1`) |
| `ATC_SEP_DEPARTURE_DEPARTURE` | Departure-to-departure runway separation (minutes) | Positive integer (`>= 1`) |
| `ATC_SEP_MIXED` | Arrival/departure mixed separation (minutes) | Positive integer (`>= 1`) |
| `ATC_GATE_TURNAROUND` | Gate occupancy extension after operation (minutes) | Positive integer (`>= 1`) |
| `ATC_DEPENDENCY_BUFFER` | Buffer after dependency end before dependent can start (minutes) | Positive integer (`>= 1`) |
| `ATC_SCHEDULE_HORIZON` | Hard schedule horizon from run start (minutes) | Positive integer (`>= 1`) |

### Validation behavior

On startup, invalid values fail fast with clear errors, for example:

```text
[config] Missing required environment variable: ATC_RUNWAY_COUNT
```

or

```text
[config] Environment variable ATC_RUNWAY_COUNT must be a positive integer, got: "0"
```

## 3) Database setup and table descriptions

### How DB is created

The DB is initialized automatically at startup:

1. Server opens `ATC_DB_PATH`
2. Creates directory if needed
3. Applies migrations in order
4. Persists a config snapshot

No manual schema creation is required.

### Quick setup

```bash
cp .env.example .env
npm run build
node dist/index.js
```

### Inspect tables

```bash
sqlite3 data/atc.db ".tables"
```

### Tables

#### `schema_migrations`

Tracks applied migration versions.

- `version` (PK)
- `description`
- `applied_at`

#### `server_meta`

Server metadata key-value store.

- `key` (PK)
- `value`

#### `flights`

Source-of-truth for all submitted flights.

- `id` (PK, UUID)
- `flight_number`
- `operation_type` (`arrival` or `departure`)
- `priority` (`high`, `medium`, `low`)
- `state` (`queued`, `scheduled`, `completed`, `cancelled`, `blocked`)
- `scheduled_time` (nullable, ISO time)
- `depends_on` (nullable, comma-separated dependency IDs)
- `preferred_runway` (nullable integer)
- `block_reason` (nullable text)
- `created_at`
- `updated_at`

#### `schedule_entries`

Current active schedule (full-replacement on each `generateSchedule`).

- `id` (PK, UUID)
- `flight_id` (FK -> `flights.id`)
- `runway_id`
- `gate_id`
- `crew_id`
- `start_time`
- `end_time`
- `duration_minutes`
- `created_at`

#### `config_snapshots`

Append-only history of effective startup config.

- `id` (PK, UUID)
- `runway_count`
- `gate_count`
- `crew_count`
- `sep_arrival_arrival`
- `sep_departure_departure`
- `sep_mixed`
- `gate_turnaround`
- `dependency_buffer`
- `schedule_horizon`
- `created_at`

## 4) Run server, connect MCP clients, and API reference

### Run server (stdio)

```bash
npm run build
node dist/index.js
```

### Connect from MCP-compatible clients

Use stdio with:

- command: `node`
- args: `dist/index.js`
- cwd: project root

#### GitHub Copilot (VS Code)

Create `.vscode/mcp.json`:

```json
{
	"servers": {
		"atc": {
			"type": "stdio",
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "${workspaceFolder}"
		}
	}
}
```

#### Cursor

Add server in Cursor MCP configuration (`mcpServers` section). Example:

```json
{
	"mcpServers": {
		"atc": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "/absolute/path/to/task-4"
		}
	}
}
```

#### Claude Code

Add server in Claude Code MCP configuration (`mcpServers` section). Example:

```json
{
	"mcpServers": {
		"atc": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "/absolute/path/to/task-4"
		}
	}
}
```

Note: exact config file path can vary by client/version; the server block above is the important part.

## Tools reference

### `getServerStatus`

Read-only server health and metadata.

- Inputs: none
- Returns: name, version, uptime, db path, schema version

### `submitFlight`

Persists a flight in `queued` state.

- Required:
	- `flightNumber` (string, 2-20 chars)
	- `operationType` (`arrival` or `departure`)
	- `priority` (`high`, `medium`, `low`)
- Optional:
	- `dependencies` (UUID list)
	- `preferredRunway` (positive integer)

### `generateSchedule`

Deterministically recomputes full schedule and replaces current schedule.

- Inputs: none
- Behavior: full replacement, not incremental
- Returns: counts + blocked reasons

### `cancelFlight`

Cancels one flight by user-facing flight number and re-evaluates schedule in one transaction.

- Required:
	- `flight_number` (string, 1-20 chars)
- Optional:
	- `reason` (string, max 200 chars)

### `getAirportStatus`

Returns structured operational status from persisted state.

- Inputs: none
- Includes: counts by state/type, capacity and usage, constrained resources,
	blocked or unscheduled flights with reasons, schedule completion time

### `getBottleneck`

Finds longest active scheduled dependency chain.

- Inputs: none
- Returns: ordered chain and elapsed duration in minutes

## Resources reference (read-only)

### `atc://flights`

All persisted flights with state, schedule, dependencies, and reason fields.

### `atc://timeline`

Chronological list of scheduled operations.

### `atc://runways`

Runway usage and overlap consistency checks.

### `atc://gates`

Gate occupancy windows (includes turnaround) and overlap consistency checks.

## Quick smoke test

After connecting client:

1. Call `submitFlight` two times
2. Call `generateSchedule`
3. Read `atc://timeline`
4. Call `getAirportStatus`
5. Call `getBottleneck`

This verifies write path, schedule generation, and read-side introspection.
