import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeStreakUpdate, daysBetween, todayDateString } from '../src/db/streak.ts';

test('daysBetween counts whole calendar days', () => {
  assert.equal(daysBetween('2026-07-23', '2026-07-24'), 1);
  assert.equal(daysBetween('2026-07-20', '2026-07-24'), 4);
  assert.equal(daysBetween('2026-07-24', '2026-07-24'), 0);
});

test('todayDateString formats as YYYY-MM-DD', () => {
  assert.match(todayDateString(new Date('2026-07-24T23:59:00Z')), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(todayDateString(new Date('2026-07-24T12:00:00Z')), '2026-07-24');
});

test('first-ever completion starts a streak of 1, not broken', () => {
  const result = computeStreakUpdate(null, 0, '2026-07-24');
  assert.deepEqual(result, { streak: 1, streakBroken: false });
});

test('a second completion the same day leaves the streak unchanged', () => {
  const result = computeStreakUpdate('2026-07-24', 5, '2026-07-24');
  assert.deepEqual(result, { streak: 5, streakBroken: false });
});

test('completing on the very next calendar day increments the streak', () => {
  const result = computeStreakUpdate('2026-07-23', 5, '2026-07-24');
  assert.deepEqual(result, { streak: 6, streakBroken: false });
});

test('missing a day resets the streak to 1 and reports it broken', () => {
  const result = computeStreakUpdate('2026-07-20', 5, '2026-07-24');
  assert.deepEqual(result, { streak: 1, streakBroken: true });
});

test('missing a day when the streak was already 0 resets but is not "broken"', () => {
  // Nothing to break — e.g. a first-time player who opened the app once
  // days ago without completing a room, then completes one now.
  const result = computeStreakUpdate('2026-07-01', 0, '2026-07-24');
  assert.deepEqual(result, { streak: 1, streakBroken: false });
});
