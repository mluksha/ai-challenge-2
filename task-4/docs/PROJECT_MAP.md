task-4/
├── src/
│   ├── index.ts                  ← Entry point. Wires server + DB + tools/resources.
│   ├── server.ts                 ← MCP server factory. Registers all tools & resources.
│   │
│   ├── config/
│   │   └── env.ts                ← Reads & validates all environment variables. Fails fast.
│   │
│   ├── db/
│   │   ├── connection.ts         ← Opens SQLite connection. Exports db singleton.
│   │   └── migrations.ts         ← Runs schema migrations in order. Idempotent.
│   │
│   ├── domain/
│   │   ├── types.ts              ← All TypeScript domain types (Flight, Resource, Schedule…).
│   │   └── constants.ts          ← Shared enums and string literals.
│   │
│   ├── persistence/
│   │   ├── flightRepository.ts   ← CRUD for flights table.
│   │   ├── scheduleRepository.ts ← CRUD for schedule_entries table.
│   │   ├── resourceRepository.ts ← Reads runway/gate/crew usage from DB.
│   │   └── configRepository.ts   ← Persists & reads effective config snapshot.
│   │
│   ├── scheduling/
│   │   └── scheduler.ts          ← Pure deterministic scheduling algorithm.
│   │
│   └── tools/
│       ├── getServerStatus.ts    ← Tool: getServerStatus  (Stage 1)
│       ├── submitFlight.ts       ← Tool: submitFlight     (Stage 3)
│       ├── generateSchedule.ts   ← Tool: generateSchedule (Stage 5)
│       ├── cancelFlight.ts       ← Tool: cancelFlight     (Stage 7)
│       ├── getAirportStatus.ts   ← Tool: getAirportStatus (Stage 8)
│       └── getBottleneck.ts      ← Tool: getBottleneck    (Stage 9)
│
│   └── resources/
│       ├── flightsResource.ts    ← Resource: atc://flights           (Stage 3)
│       ├── timelineResource.ts   ← Resource: atc://timeline          (Stage 6)
│       ├── runwaysResource.ts    ← Resource: atc://runways           (Stage 6)
│       └── gatesResource.ts     ← Resource: atc://gates             (Stage 6)
│
├── data/
│   └── .gitkeep                  ← SQLite file written here at runtime (atc.db)
│
├── package.json
├── tsconfig.json
└── .env.example                  ← Documents all required env vars