import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import * as authClient from '../auth/authClient';
import type { AuthSession } from '../auth/authClient';
import { HEARTS_START, XP_PER_CORRECT } from '../constants/gameBalance';
import { getProgress, getUser, initDatabase, logEvent, persistRoomCompletion } from '../db/database';
import { syncNow } from '../sync/syncQueue';
import type { EraId } from '../types/content';
import type { ProgressRow } from '../types/db';

// Build Roadmap Step 3: xp/streak/unlocked-room progress now persists to
// SQLite (see ../db/database.ts) instead of resetting on every reload.
// Hearts stay in-memory — Section 6 defines them as "3 per room attempt,"
// not a value that needs to survive an app restart, and server-side
// hearts regeneration is Step 6 (gamification hardening), not this step.
//
// Build Roadmap Step 4: that local state also gets pushed to the
// self-hosted PocketBase backend via syncNow() (../sync/syncQueue.ts) — on
// boot, on every foreground resume, and after each room completion. Sync
// is fire-and-forget and never awaited by the UI: offline play must never
// be blocked or slowed down by it.
//
// Build Roadmap Step 5: optional email+password auth (../auth/authClient.ts)
// links a device's progress to an account for cross-device continuity. A
// successful login/register can rewrite local xp/streak/progress (the
// "adopt" case in authClient's module comment), so those calls reload
// local state into this context afterwards rather than assuming nothing
// changed.

interface QuizContext {
  eraId: EraId;
  artworkId: string;
}

interface AppState {
  /** False until the DB is opened and initial state is loaded. */
  ready: boolean;
  hearts: number;
  xp: number;
  streak: number;
  unlockedIndex: number;
  progress: Partial<Record<EraId, ProgressRow>>;
  loseHeart: () => void;
  resetHearts: () => void;
  completeRoom: (eraId: EraId, correct: number, total: number) => Promise<number>;
  logQuestionAnswered: (eraId: EraId, artworkId: string, correct: boolean, timeToAnswerMs: number) => void;
  enterQuiz: (eraId: EraId, artworkId: string) => void;
  exitQuiz: () => void;
  session: AuthSession | null;
  authBusy: boolean;
  authError: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hearts, setHearts] = useState(HEARTS_START);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const [progress, setProgress] = useState<Partial<Record<EraId, ProgressRow>>>({});
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Mutable, not state: read by the background/foreground listener without
  // needing to resubscribe on every question.
  const quizContextRef = useRef<QuizContext | null>(null);

  async function loadLocalState(): Promise<void> {
    const [user, progressRows] = await Promise.all([getUser(), getProgress()]);
    setXp(user.xp);
    setStreak(user.streak);
    setUnlockedIndex(user.unlockedEraIndex);
    setProgress(Object.fromEntries(progressRows.map((p) => [p.eraId, p])));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDatabase();
      const restored = await authClient.restoreSession();
      if (cancelled) return;
      setSessionState(restored);
      await loadLocalState();
      if (cancelled) return;
      setReady(true);
      await logEvent({ eventType: 'session_start' });
      void syncNow();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        const q = quizContextRef.current;
        // era_id/artwork_id double as the drop-off point (Section 5: "drop-off
        // point if a session ends mid-quiz") when the app backgrounds mid-room.
        logEvent({ eventType: 'session_end', eraId: q?.eraId ?? null, artworkId: q?.artworkId ?? null });
      } else if (next === 'active') {
        logEvent({ eventType: 'session_start' });
        void syncNow();
      }
    };
    const sub = RNAppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      hearts,
      xp,
      streak,
      unlockedIndex,
      progress,
      loseHeart: () => setHearts((h) => Math.max(0, h - 1)),
      resetHearts: () => setHearts(HEARTS_START),
      completeRoom: async (eraId, correct) => {
        const xpGained = correct * XP_PER_CORRECT;
        const result = await persistRoomCompletion(eraId, correct, xpGained);
        setXp(result.xp);
        setStreak(result.streak);
        setUnlockedIndex(result.unlockedEraIndex);
        setProgress((prev) => ({
          ...prev,
          [eraId]: {
            eraId,
            completed: true,
            bestScore: Math.max(prev[eraId]?.bestScore ?? 0, correct),
            serverId: prev[eraId]?.serverId ?? null,
          },
        }));
        if (result.streakBroken) {
          await logEvent({ eventType: 'streak_broken', eraId });
        }
        await logEvent({ eventType: 'room_completed', eraId });
        void syncNow();
        return xpGained;
      },
      logQuestionAnswered: (eraId, artworkId, correct, timeToAnswerMs) => {
        logEvent({ eventType: 'question_answered', eraId, artworkId, correct, timeToAnswerMs });
      },
      enterQuiz: (eraId, artworkId) => {
        quizContextRef.current = { eraId, artworkId };
      },
      exitQuiz: () => {
        quizContextRef.current = null;
      },
      session,
      authBusy,
      authError,
      register: async (email, password) => {
        setAuthBusy(true);
        setAuthError(null);
        try {
          const result = await authClient.register(email, password);
          setSessionState(result);
          await loadLocalState();
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Registration failed');
          throw err;
        } finally {
          setAuthBusy(false);
        }
      },
      login: async (email, password) => {
        setAuthBusy(true);
        setAuthError(null);
        try {
          const result = await authClient.login(email, password);
          setSessionState(result);
          await loadLocalState();
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Login failed');
          throw err;
        } finally {
          setAuthBusy(false);
        }
      },
      logout: async () => {
        await authClient.logout();
        setSessionState(null);
      },
    }),
    [ready, hearts, xp, streak, unlockedIndex, progress, session, authBusy, authError]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
