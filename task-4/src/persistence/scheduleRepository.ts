/**
 * persistence/scheduleRepository.ts
 *
 * Persistence boundary for schedule replacement writes.
 *
 * Stage 5 requirements:
 * - generateSchedule always fully replaces the current schedule
 * - old schedule entries are discarded atomically
 * - flights are updated to scheduled/blocked consistently in the same transaction
 */

import { getDb } from "../db/connection.js";
import type Database from "better-sqlite3";
import type {
  BlockedAssignment,
  ScheduledAssignment,
} from "../scheduling/scheduler.js";

export interface ScheduleWriteSummary {
  scheduledCount: number;
  blockedCount: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function applyScheduleReplacement(
  db: Database.Database,
  scheduled: ScheduledAssignment[],
  blocked: BlockedAssignment[]
): ScheduleWriteSummary {
  const timestamp = nowIso();

  db.prepare("DELETE FROM schedule_entries").run();

  db.prepare(
    `UPDATE flights
     SET state = 'queued', scheduled_time = NULL, block_reason = NULL, updated_at = ?
     WHERE state IN ('queued','blocked','scheduled')`
  ).run(timestamp);

  const insertSchedule = db.prepare(`
    INSERT INTO schedule_entries (
      id,
      flight_id,
      runway_id,
      gate_id,
      crew_id,
      start_time,
      end_time,
      duration_minutes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const setScheduled = db.prepare(
    `UPDATE flights
     SET state = 'scheduled', scheduled_time = ?, block_reason = NULL, updated_at = ?
     WHERE id = ?`
  );

  const setBlocked = db.prepare(
    `UPDATE flights
     SET state = 'blocked', scheduled_time = NULL, block_reason = ?, updated_at = ?
     WHERE id = ?`
  );

  for (const item of scheduled) {
    insertSchedule.run(
      crypto.randomUUID(),
      item.flightId,
      item.runwayId,
      item.gateId,
      item.crewId,
      item.startTime,
      item.endTime,
      item.durationMinutes,
      timestamp
    );
    setScheduled.run(item.startTime, timestamp, item.flightId);
  }

  for (const item of blocked) {
    setBlocked.run(item.reason, timestamp, item.flightId);
  }

  return {
    scheduledCount: scheduled.length,
    blockedCount: blocked.length,
  };
}

export function replaceSchedule(
  scheduled: ScheduledAssignment[],
  blocked: BlockedAssignment[]
): ScheduleWriteSummary {
  const db = getDb();
  const tx = db.transaction(() => {
    return applyScheduleReplacement(db, scheduled, blocked);
  });

  return tx();
}
