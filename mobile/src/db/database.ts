import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { ERAS } from '../content';
import type { EraId } from '../types/content';
import type { NewEvent, ProgressRow, UserRow } from '../types/db';
import { SCHEMA_SQL } from './schema';
import { computeStreakUpdate, todayDateString } from './streak';

export { todayDateString };

const DB_NAME = 'art_history.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);

  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM user WHERE id = 1');
  if (!existing) {
    await db.runAsync(
      'INSERT INTO user (id, xp, streak, last_active_date, device_uuid, premium, unlocked_era_index) VALUES (1, 0, 0, NULL, ?, 0, 0)',
      [Crypto.randomUUID()]
    );
  }

  for (const era of ERAS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO user_progress (era_id, completed, best_score) VALUES (?, 0, 0)',
      [era.id]
    );
  }
}

export async function getUser(): Promise<UserRow> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    xp: number;
    streak: number;
    last_active_date: string | null;
    device_uuid: string;
    premium: number;
    unlocked_era_index: number;
  }>('SELECT xp, streak, last_active_date, device_uuid, premium, unlocked_era_index FROM user WHERE id = 1');
  if (!row) throw new Error('user row missing — call initDatabase() first');
  return {
    xp: row.xp,
    streak: row.streak,
    lastActiveDate: row.last_active_date,
    deviceUuid: row.device_uuid,
    premium: !!row.premium,
    unlockedEraIndex: row.unlocked_era_index,
  };
}

export async function getProgress(): Promise<ProgressRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ era_id: EraId; completed: number; best_score: number }>(
    'SELECT era_id, completed, best_score FROM user_progress'
  );
  return rows.map((r) => ({ eraId: r.era_id, completed: !!r.completed, bestScore: r.best_score }));
}

interface CompleteRoomResult {
  xp: number;
  streak: number;
  unlockedEraIndex: number;
  streakBroken: boolean;
}

/**
 * Persists a room completion: upserts user_progress, applies the Section 6
 * daily-streak rule (increments once per calendar day, resets on a missed
 * day — no streak-freeze item exists yet, that's deferred), advances
 * unlocked_era_index, and returns the new totals so the caller doesn't need
 * a second read.
 */
export async function persistRoomCompletion(
  eraId: EraId,
  correct: number,
  xpGained: number
): Promise<CompleteRoomResult> {
  const db = await getDb();
  const eraIndex = ERAS.findIndex((e) => e.id === eraId);
  const today = todayDateString();

  await db.runAsync(
    'UPDATE user_progress SET completed = 1, best_score = MAX(best_score, ?) WHERE era_id = ?',
    [correct, eraId]
  );

  const user = await getUser();
  const { streak, streakBroken } = computeStreakUpdate(user.lastActiveDate, user.streak, today);

  const unlockedEraIndex = Math.max(user.unlockedEraIndex, Math.min(eraIndex + 1, ERAS.length - 1));
  const newXp = user.xp + xpGained;

  await db.runAsync(
    'UPDATE user SET xp = ?, streak = ?, last_active_date = ?, unlocked_era_index = ? WHERE id = 1',
    [newXp, streak, today, unlockedEraIndex]
  );

  return { xp: newXp, streak, unlockedEraIndex, streakBroken };
}

export async function logEvent(event: NewEvent): Promise<void> {
  const db = await getDb();
  const user = await getUser();
  await db.runAsync(
    `INSERT INTO events (id, device_uuid, event_type, era_id, artwork_id, correct, time_to_answer_ms, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      user.deviceUuid,
      event.eventType,
      event.eraId ?? null,
      event.artworkId ?? null,
      event.correct === undefined || event.correct === null ? null : event.correct ? 1 : 0,
      event.timeToAnswerMs ?? null,
      new Date().toISOString(),
    ]
  );
}

export async function countEvents(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM events');
  return row?.count ?? 0;
}
