// Local SQLite shapes — Build Roadmap Steps 3-4. Mirrors the "User tables"
// and "Analytics table" from project-plan.md Section 5.

import type { EraId } from './content';

export interface UserRow {
  xp: number;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD, device-local-ish (see database.ts)
  deviceUuid: string;
  premium: boolean; // unused — Section 8 gating is deferred
  unlockedEraIndex: number;
  /** The PocketBase `player` record id, once the sync queue has created one. */
  serverId: string | null;
}

export interface ProgressRow {
  eraId: EraId;
  completed: boolean;
  bestScore: number;
  /** The PocketBase `player_progress` record id, once synced. */
  serverId: string | null;
}

export type EventType =
  | 'session_start'
  | 'session_end'
  | 'question_answered'
  | 'room_completed'
  | 'streak_broken';

export interface NewEvent {
  eventType: EventType;
  eraId?: EraId | null;
  artworkId?: string | null;
  correct?: boolean | null;
  timeToAnswerMs?: number | null;
}

/** A locally-logged event not yet confirmed uploaded (events.synced = 0). */
export interface UnsyncedEventRow {
  id: string;
  deviceUuid: string;
  eventType: EventType;
  eraId: string | null;
  artworkId: string | null;
  correct: boolean | null;
  timeToAnswerMs: number | null;
  timestamp: string;
}
