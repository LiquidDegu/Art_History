// Build Roadmap Step 4's sync queue: batch-uploads locally-persisted
// progress + events to the self-hosted PocketBase backend (see
// backend/pocketbase/). Per Section 4: "queue-based. Events/progress
// changes are written locally with a device UUID + timestamp. On
// reconnect, the app batch-uploads the queue... Conflict resolution:
// simple last-write-wins is sufficient." There's no dedicated
// connectivity-change listener — this is triggered on app boot, on
// foreground resume, and after each room completion (see AppState.tsx),
// which covers "on reconnect" well enough without adding a network-status
// dependency. Every failure is swallowed: sync is best-effort and must
// never block or interrupt offline play.
import {
  getProgress,
  getUnsyncedEvents,
  getUser,
  markEventSynced,
  setProgressServerId,
  setUserServerId,
} from '../db/database';
import type { EraId } from '../types/content';
import { PocketBaseRequestError, createRecord, hasFieldError, updateRecord } from './pocketbaseClient';

interface PlayerRecord {
  id: string;
}

interface ProgressRecord {
  id: string;
}

/** Creates or updates this device's `player` record; returns its server id, or null if it can't be resolved right now. */
async function ensurePlayerSynced(): Promise<string | null> {
  const user = await getUser();

  if (user.serverId) {
    try {
      await updateRecord('player', user.serverId, {
        xp: user.xp,
        streak: user.streak,
        last_active_date: user.lastActiveDate,
        unlocked_era_index: user.unlockedEraIndex,
        premium: user.premium,
      });
      return user.serverId;
    } catch (err) {
      // The remote record is gone (e.g. server data was reset during dev) —
      // fall through and create a new one instead of failing forever.
      if (!(err instanceof PocketBaseRequestError && err.status === 404)) throw err;
    }
  }

  try {
    const created = await createRecord<PlayerRecord>('player', {
      device_uuid: user.deviceUuid,
      xp: user.xp,
      streak: user.streak,
      hearts: 3,
      last_active_date: user.lastActiveDate,
      unlocked_era_index: user.unlockedEraIndex,
      premium: user.premium,
    });
    await setUserServerId(created.id);
    return created.id;
  } catch (err) {
    if (hasFieldError(err, 'device_uuid', 'validation_not_unique')) {
      // A player record for this device_uuid already exists server-side,
      // but this device lost track of its id (e.g. local data partially
      // reset). Without auth (Step 5) there's no way to look records up by
      // device_uuid — pb_migrations' view/list rules are superuser-only on
      // purpose (see backend/pocketbase/README.md) — so this device's sync
      // just stays skipped until Step 5 can reconcile it.
      return null;
    }
    throw err;
  }
}

async function syncProgress(playerServerId: string): Promise<void> {
  const rows = await getProgress();
  for (const row of rows) {
    if (!row.completed && !row.serverId) continue; // untouched era — nothing to sync yet

    if (row.serverId) {
      await updateRecord('player_progress', row.serverId, {
        completed: row.completed,
        best_score: row.bestScore,
      });
    } else {
      const created = await createRecord<ProgressRecord>('player_progress', {
        player: playerServerId,
        era_id: row.eraId,
        completed: row.completed,
        best_score: row.bestScore,
      });
      await setProgressServerId(row.eraId as EraId, created.id);
    }
  }
}

async function syncEvents(): Promise<void> {
  const events = await getUnsyncedEvents();
  for (const event of events) {
    try {
      await createRecord('events', {
        device_uuid: event.deviceUuid,
        event_type: event.eventType,
        era_id: event.eraId,
        artwork_id: event.artworkId,
        correct: event.correct,
        time_to_answer_ms: event.timeToAnswerMs,
        timestamp: event.timestamp,
        client_event_id: event.id,
      });
      await markEventSynced(event.id);
    } catch (err) {
      if (hasFieldError(err, 'client_event_id', 'validation_not_unique')) {
        // Uploaded in an earlier attempt that crashed/lost connection
        // before the local synced flag got set — same outcome, so treat it
        // as success and move on to the next event.
        await markEventSynced(event.id);
        continue;
      }
      throw err; // network error or something unexpected — stop this pass, retry on the next trigger
    }
  }
}

let syncInFlight = false;

export async function syncNow(): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const playerServerId = await ensurePlayerSynced();
    if (playerServerId) {
      await syncProgress(playerServerId);
    }
    await syncEvents();
  } catch {
    // Best-effort — see module comment. Swallow and retry next trigger.
  } finally {
    syncInFlight = false;
  }
}
