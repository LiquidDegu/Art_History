// Runs the actual SCHEMA_SQL from src/db/schema.ts against Node's built-in
// node:sqlite (not expo-sqlite — that only runs on-device/in a worker, see
// mobile/README.md for why this session couldn't exercise it in a browser).
// This checks the schema itself is valid SQLite and that the upsert
// patterns database.ts relies on (INSERT OR IGNORE, MAX() in an UPDATE)
// behave the way persistRoomCompletion() assumes.

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { SCHEMA_SQL } from '../src/db/schema.ts';

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA_SQL);
  return db;
}

test('schema creates the expected tables', () => {
  const db = freshDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((r: any) => r.name)
    .sort();
  assert.deepEqual(tables, ['events', 'user', 'user_progress']);
  db.close();
});

test('INSERT OR IGNORE seeds user_progress once per era without clobbering existing rows', () => {
  const db = freshDb();
  const insert = db.prepare('INSERT OR IGNORE INTO user_progress (era_id, completed, best_score) VALUES (?, 0, 0)');
  for (const eraId of ['ancient', 'medieval']) insert.run(eraId);

  // Simulate a completed room, then re-run the seed (as initDatabase() does
  // on every app boot) and confirm it doesn't reset progress back to 0.
  db.exec("UPDATE user_progress SET completed = 1, best_score = 7 WHERE era_id = 'ancient'");
  for (const eraId of ['ancient', 'medieval']) insert.run(eraId);

  const row: any = db.prepare('SELECT completed, best_score FROM user_progress WHERE era_id = ?').get('ancient');
  assert.equal(row.completed, 1);
  assert.equal(row.best_score, 7);
});

test('best_score UPDATE uses MAX() so a worse retry never lowers it', () => {
  const db = freshDb();
  db.exec("INSERT INTO user_progress (era_id, completed, best_score) VALUES ('ancient', 0, 0)");
  const bump = db.prepare('UPDATE user_progress SET completed = 1, best_score = MAX(best_score, ?) WHERE era_id = ?');

  bump.run(6, 'ancient');
  bump.run(3, 'ancient'); // a worse replay
  bump.run(8, 'ancient'); // a better replay

  const row: any = db.prepare('SELECT best_score FROM user_progress WHERE era_id = ?').get('ancient');
  assert.equal(row.best_score, 8);
});

test('events rows accept nullable era_id/artwork_id/correct/time_to_answer_ms', () => {
  const db = freshDb();
  db.exec(`
    INSERT INTO events (id, device_uuid, event_type, era_id, artwork_id, correct, time_to_answer_ms, timestamp)
    VALUES ('e1', 'device-1', 'session_start', NULL, NULL, NULL, NULL, '2026-07-24T00:00:00.000Z')
  `);
  const row: any = db.prepare('SELECT * FROM events WHERE id = ?').get('e1');
  assert.equal(row.event_type, 'session_start');
  assert.equal(row.era_id, null);
});
