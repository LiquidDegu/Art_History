import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { ERAS } from '../content';
import type { EraId } from '../types/content';
import type { NewEvent, ProgressRow, UnsyncedEventRow, UserRow } from '../types/db';
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

/**
 * Adds a column to an existing table if it isn't there yet — SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, and SCHEMA_SQL's `CREATE TABLE IF NOT EXISTS`
 * only runs once per fresh install, so columns added after Step 3 (the
 * sync-queue's server_id/synced tracking, Step 4) need this to reach
 * devices that already have a database on disk.
 */
async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, ddlType: string): Promise<void> {
  const existingColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!existingColumns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA_SQL);
  await ensureColumn(db, 'user', 'server_id', 'TEXT');
  await ensureColumn(db, 'user_progress', 'server_id', 'TEXT');
  await ensureColumn(db, 'events', 'synced', 'INTEGER NOT NULL DEFAULT 0');

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
    server_id: string | null;
  }>(
    'SELECT xp, streak, last_active_date, device_uuid, premium, unlocked_era_index, server_id FROM user WHERE id = 1'
  );
  if (!row) throw new Error('user row missing — call initDatabase() first');
  return {
    xp: row.xp,
    streak: row.streak,
    lastActiveDate: row.last_active_date,
    deviceUuid: row.device_uuid,
    premium: !!row.premium,
    unlockedEraIndex: row.unlocked_era_index,
    serverId: row.server_id,
  };
}

export async function setUserServerId(serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE user SET server_id = ? WHERE id = 1', [serverId]);
}

interface ServerUserState {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  unlockedEraIndex: number;
  serverId: string;
}

interface ServerProgressState {
  eraId: EraId;
  completed: boolean;
  bestScore: number;
  serverId: string;
}

/**
 * Overwrites local xp/streak/progress with an account's server-side state —
 * used by ../auth/authClient.ts when logging into a device that already
 * belongs to a *different* claimed player record (Step 5's "adopt, don't
 * merge" rule for a second device: see mobile/README.md). Not used for the
 * device that originates a claim — that direction is local-wins, handled
 * by syncNow()'s normal PATCH-up flow instead.
 */
export async function overwriteFromServer(user: ServerUserState, progress: ServerProgressState[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE user SET xp = ?, streak = ?, last_active_date = ?, unlocked_era_index = ?, server_id = ? WHERE id = 1',
    [user.xp, user.streak, user.lastActiveDate, user.unlockedEraIndex, user.serverId]
  );
  for (const p of progress) {
    await db.runAsync(
      'UPDATE user_progress SET completed = ?, best_score = ?, server_id = ? WHERE era_id = ?',
      [p.completed ? 1 : 0, p.bestScore, p.serverId, p.eraId]
    );
  }
}

export async function getProgress(): Promise<ProgressRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ era_id: EraId; completed: number; best_score: number; server_id: string | null }>(
    'SELECT era_id, completed, best_score, server_id FROM user_progress'
  );
  return rows.map((r) => ({
    eraId: r.era_id,
    completed: !!r.completed,
    bestScore: r.best_score,
    serverId: r.server_id,
  }));
}

export async function setProgressServerId(eraId: EraId, serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE user_progress SET server_id = ? WHERE era_id = ?', [serverId, eraId]);
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

export async function getUnsyncedEvents(limit = 100): Promise<UnsyncedEventRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    device_uuid: string;
    event_type: UnsyncedEventRow['eventType'];
    era_id: string | null;
    artwork_id: string | null;
    correct: number | null;
    time_to_answer_ms: number | null;
    timestamp: string;
  }>('SELECT * FROM events WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?', [limit]);
  return rows.map((r) => ({
    id: r.id,
    deviceUuid: r.device_uuid,
    eventType: r.event_type,
    eraId: r.era_id,
    artworkId: r.artwork_id,
    correct: r.correct === null ? null : !!r.correct,
    timeToAnswerMs: r.time_to_answer_ms,
    timestamp: r.timestamp,
  }));
}

export async function markEventSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE events SET synced = 1 WHERE id = ?', [id]);
}
