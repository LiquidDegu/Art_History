// Build Roadmap Step 7: "streak-reminder nudges via Expo Notifications"
// (Section 9), implementing Section 2's "close app → optional push
// notification later in the day if the streak is still unclaimed."
//
// Local scheduled notifications, not remote/server-sent push, on purpose:
// the actual product need ("remind me tonight if I haven't played yet")
// is fully satisfiable on-device with expo-notifications' local
// scheduling API — no push token registration, no Expo/EAS account, no
// server round-trip. Remote push (e.g. a re-engagement campaign sent from
// the backend to lapsed users) is a different, bigger feature this
// section of the plan doesn't actually ask for; if that's wanted later,
// it's an addition, not a fix to this.
//
// Known limitation: expo-notifications' *scheduling* API isn't supported
// on web (no equivalent of a native OS-level scheduler without a service
// worker + real Web Push setup, a materially different mechanism). Every
// exported function here no-ops on web rather than throwing — confirmed
// by running the app in a browser, which is the only environment this
// could actually be exercised in; native iOS/Android behavior (where this
// feature actually matters) is implemented against expo-notifications'
// real documented API but couldn't be verified on a physical
// device/simulator in this sandbox.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { STREAK_REMINDER_HOUR } from '../constants/gameBalance';
import { todayDateString } from '../db/streak';

const REMINDER_IDENTIFIER = 'streak-reminder';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function cancelStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // Nothing was scheduled — fine, that's the common case.
  }
}

/**
 * Schedules tonight's streak reminder if (a) the player hasn't already
 * played today and (b) it isn't already past the reminder hour. Call this
 * when the app backgrounds — see state/AppState.tsx.
 */
export async function scheduleStreakReminderIfNeeded(streak: number, lastActiveDate: string | null): Promise<void> {
  if (Platform.OS === 'web') return;

  if (lastActiveDate === todayDateString()) {
    // Already played today — the streak isn't at risk, don't nag.
    await cancelStreakReminder();
    return;
  }

  const target = new Date();
  target.setHours(STREAK_REMINDER_HOUR, 0, 0, 0);
  if (target.getTime() <= Date.now()) return; // past tonight's reminder hour — skip rather than fire immediately

  if (!(await ensurePermission())) return;

  await cancelStreakReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: streak > 0 ? `Don't lose your ${streak}-day streak!` : 'Keep the momentum going!',
      body: 'Play a quick room in the gallery before the day ends.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
}
