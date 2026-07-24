// Local SQLite shapes — Build Roadmap Step 3. Mirrors the "User tables" and
// "Analytics table" from project-plan.md Section 5, minus the fields that
// only make sense once there's a server to sync against (Step 4+): no
// synced-status flag yet, no server-assigned uuid.

import type { EraId } from './content';

export interface UserRow {
  xp: number;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD, device-local-ish (see database.ts)
  deviceUuid: string;
  premium: boolean; // unused — Section 8 gating is deferred
  unlockedEraIndex: number;
}

export interface ProgressRow {
  eraId: EraId;
  completed: boolean;
  bestScore: number;
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
