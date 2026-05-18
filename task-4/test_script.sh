set -e
cp .env.example .env
rm -f data/atc.db

# Submit ARR100
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"submitFlight","arguments":{"flightNumber":"ARR100","operationType":"arrival","priority":"high"}}}\n' | node dist/index.js 2>/dev/null > /tmp/stage5_s1.jsonl

ARR100_ID=$(sqlite3 data/atc.db "SELECT id FROM flights WHERE flight_number='ARR100' LIMIT 1;")

# Submit dependent DEP200 and invalid runway BAD300
printf '{"jsonrpc":"2.0","id":10,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"submitFlight","arguments":{"flightNumber":"DEP200","operationType":"departure","priority":"medium","dependencies":["'"$ARR100_ID"'"]}}}\n{"jsonrpc":"2.0","id":12,"method":"tools/call","params":{"name":"submitFlight","arguments":{"flightNumber":"BAD300","operationType":"arrival","priority":"low","preferredRunway":99}}}\n' | node dist/index.js 2>/dev/null > /tmp/stage5_s2.jsonl

# Generate schedule
printf '{"jsonrpc":"2.0","id":20,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":21,"method":"tools/call","params":{"name":"generateSchedule","arguments":{}}}\n' | node dist/index.js 2>/dev/null > /tmp/stage5_gen1.jsonl

# Read flights resource
printf '{"jsonrpc":"2.0","id":30,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":31,"method":"resources/read","params":{"uri":"atc://flights"}}\n' | node dist/index.js 2>/dev/null > /tmp/stage5_flights.jsonl

# Re-run schedule to confirm full replacement works
printf '{"jsonrpc":"2.0","id":40,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\n{"jsonrpc":"2.0","id":41,"method":"tools/call","params":{"name":"generateSchedule","arguments":{}}}\n' | node dist/index.js 2>/dev/null > /tmp/stage5_gen2.jsonl

# Print concise results
echo '--- generateSchedule run #1 ---'
cat /tmp/stage5_gen1.jsonl
echo '--- flights states in sqlite ---'
sqlite3 data/atc.db "SELECT flight_number, state, COALESCE(block_reason,''), COALESCE(scheduled_time,'') FROM flights ORDER BY flight_number;"
echo '--- schedule_entries count after run #1 ---'
sqlite3 data/atc.db "SELECT COUNT(*) FROM schedule_entries;"
echo '--- generateSchedule run #2 ---'
cat /tmp/stage5_gen2.jsonl
echo '--- schedule_entries count after run #2 ---'
sqlite3 data/atc.db "SELECT COUNT(*) FROM schedule_entries;"
echo '--- schedule entries ordered ---'
sqlite3 data/atc.db "SELECT flight_id, runway_id, gate_id, crew_id, start_time, end_time FROM schedule_entries ORDER BY start_time, flight_id;"
