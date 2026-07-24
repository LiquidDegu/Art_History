// Build Roadmap Step 5: email+password auth via PocketBase's built-in
// `users` collection, so progress can follow a person across devices
// instead of staying pinned to one device_uuid forever (Step 4).
//
// What happens on login is deliberately asymmetric, matching the plan's
// Section 4 "simple last-write-wins is sufficient" stance on conflict
// resolution rather than attempting a real multi-device merge:
//   - No player record is linked to this account yet → CLAIM: this
//     device's local (anonymous) progress becomes the account's progress.
//   - The account already owns a *different* player record (i.e. you're
//     logging into this account from a second device that also has its
//     own local anonymous progress) → ADOPT: this device downloads and
//     overwrites its local state with the account's, rather than merging
//     the two histories together. The second device's pre-login progress
//     is superseded, not combined.
import * as SecureStore from 'expo-secure-store';
import { getUser, overwriteFromServer } from '../db/database';
import type { EraId } from '../types/content';
import { ensurePlayerSynced } from '../sync/syncQueue';
import {
  authRefresh,
  authWithPassword,
  createRecord,
  hasFieldError,
  listRecords,
  updateRecord,
  viewRecord,
} from '../sync/pocketbaseClient';
import { clearSession, getSession, setSession } from './session';

const STORAGE_KEY = 'pb_auth_session';

export interface AuthSession {
  userId: string;
  email: string;
}

interface AuthUserRecord {
  id: string;
  email: string;
}

interface AuthResponse {
  token: string;
  record: AuthUserRecord;
}

interface PlayerRecord {
  id: string;
  xp: number;
  streak: number;
  last_active_date: string;
  unlocked_era_index: number;
}

interface ProgressRecord {
  id: string;
  era_id: EraId;
  completed: boolean;
  best_score: number;
}

// expo-secure-store has no web implementation (it throws rather than
// no-oping) — native iOS/Android get real persistence via Keychain/
// Keystore, web just degrades to "log in again after a reload" instead of
// crashing. Every SecureStore call is wrapped for that reason, not because
// failures here are expected to matter on the platforms this actually ships to.
async function persist(token: string, userId: string, email: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ token, userId, email }));
  } catch {
    // No persistent storage on this platform — session still works for the
    // current app run via ./session.ts, it just won't survive a reload.
  }
}

async function clearPersisted(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    // See persist() above.
  }
}

/** Links the current device's local player record to `userId` — the "claim" path (see module comment). */
async function claim(userId: string): Promise<void> {
  const serverId = await ensurePlayerSynced();
  if (!serverId) return; // couldn't resolve a server record for this device — nothing to claim yet, will retry on next sync/login
  try {
    await updateRecord('player', serverId, { user: userId });
  } catch (err) {
    // Already claimed by this same account (e.g. retried after a partial
    // failure) — fine. Any other error (claimed by someone else, network,
    // etc.) is left for the caller/next attempt rather than guessed at.
    if (!hasFieldError(err, 'user', 'validation_not_unique')) throw err;
  }
}

/** Downloads `serverPlayerId`'s state and overwrites local progress with it — the "adopt" path (see module comment). */
async function adopt(serverPlayerId: string): Promise<void> {
  const [player, progressResult] = await Promise.all([
    viewRecord<PlayerRecord>('player', serverPlayerId),
    listRecords<ProgressRecord>('player_progress', `player = '${serverPlayerId}'`),
  ]);
  await overwriteFromServer(
    {
      xp: player.xp,
      streak: player.streak,
      lastActiveDate: player.last_active_date || null,
      unlockedEraIndex: player.unlocked_era_index,
      serverId: player.id,
    },
    progressResult.items.map((p) => ({
      eraId: p.era_id,
      completed: p.completed,
      bestScore: p.best_score,
      serverId: p.id,
    }))
  );
}

/** Runs right after a successful login/register: claims or adopts as appropriate (see module comment). Best-effort — errors are swallowed, same as syncNow(); a login should never fail just because reconciliation hiccuped. */
async function reconcile(userId: string): Promise<void> {
  try {
    const owned = await listRecords<PlayerRecord>('player', `user = '${userId}'`);
    const existing = owned.items[0];
    const localUser = await getUser();

    if (!existing) {
      await claim(userId);
    } else if (existing.id !== localUser.serverId) {
      await adopt(existing.id);
    }
    // else: existing.id === localUser.serverId — already in sync (e.g. re-login on the same device).
  } catch {
    // Best-effort, see doc comment.
  }
}

export async function register(email: string, password: string): Promise<AuthSession> {
  await createRecord('users', { email, password, passwordConfirm: password });
  return login(email, password);
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await authWithPassword<AuthResponse>('users', email, password);
  setSession({ token: res.token, userId: res.record.id, email: res.record.email });
  await persist(res.token, res.record.id, res.record.email);
  await reconcile(res.record.id);
  return { userId: res.record.id, email: res.record.email };
}

export async function logout(): Promise<void> {
  clearSession();
  await clearPersisted();
}

/** Call once at app boot: restores a previously-saved session if the token's still valid, so the user isn't asked to log in every launch. */
export async function restoreSession(): Promise<AuthSession | null> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null; // no persistent storage on this platform (see persist() above) — nothing to restore
  }
  if (!raw) return null;

  const stored = JSON.parse(raw) as { token: string; userId: string; email: string };
  setSession(stored);
  try {
    const refreshed = await authRefresh<AuthResponse>('users');
    setSession({ token: refreshed.token, userId: refreshed.record.id, email: refreshed.record.email });
    await persist(refreshed.token, refreshed.record.id, refreshed.record.email);
    return { userId: refreshed.record.id, email: refreshed.record.email };
  } catch {
    clearSession();
    await clearPersisted();
    return null;
  }
}

export function currentSession(): AuthSession | null {
  const session = getSession();
  return session ? { userId: session.userId, email: session.email } : null;
}
