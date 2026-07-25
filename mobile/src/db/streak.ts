// Pure logic, no expo-sqlite/expo-crypto imports, so it's testable with
// plain Node (see test/streak.test.ts) without a device/simulator — the
// daily-streak rollover (Section 6/Section 2 point 12) is the part of Step 3
// most worth getting right and easiest to get subtly wrong.

export function todayDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(b) - Date.parse(a)) / msPerDay);
}

export interface StreakUpdate {
  streak: number;
  streakBroken: boolean;
}

/**
 * Section 6: "Daily streak — increments once per calendar day with at least
 * one completed quiz round." Section 2 point 12: "if a day is missed
 * entirely, the streak resets (unless a streak-freeze was active)." No
 * streak-freeze item exists yet (deferred), so a missed day is always a
 * hard reset to 1.
 */
export function computeStreakUpdate(
  lastActiveDate: string | null,
  currentStreak: number,
  today: string = todayDateString()
): StreakUpdate {
  if (lastActiveDate === today) {
    return { streak: currentStreak, streakBroken: false };
  }
  if (lastActiveDate !== null && daysBetween(lastActiveDate, today) === 1) {
    return { streak: currentStreak + 1, streakBroken: false };
  }
  return { streak: 1, streakBroken: lastActiveDate !== null && currentStreak > 0 };
}
