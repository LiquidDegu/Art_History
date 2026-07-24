import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import { HEARTS_START, XP_PER_CORRECT } from '../constants/gameBalance';
import { getProgress, getUser, initDatabase, logEvent, persistRoomCompletion } from '../db/database';
import type { EraId } from '../types/content';
import type { ProgressRow } from '../types/db';

// Build Roadmap Step 3: xp/streak/unlocked-room progress now persists to
// SQLite (see ../db/database.ts) instead of resetting on every reload.
// Hearts stay in-memory — Section 6 defines them as "3 per room attempt,"
// not a value that needs to survive an app restart, and server-side
// hearts regeneration is Step 6 (gamification hardening), not this step.

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
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hearts, setHearts] = useState(HEARTS_START);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const [progress, setProgress] = useState<Partial<Record<EraId, ProgressRow>>>({});

  // Mutable, not state: read by the background/foreground listener without
  // needing to resubscribe on every question.
  const quizContextRef = useRef<QuizContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initDatabase();
      const [user, progressRows] = await Promise.all([getUser(), getProgress()]);
      if (cancelled) return;
      setXp(user.xp);
      setStreak(user.streak);
      setUnlockedIndex(user.unlockedEraIndex);
      setProgress(Object.fromEntries(progressRows.map((p) => [p.eraId, p])));
      setReady(true);
      await logEvent({ eventType: 'session_start' });
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
          [eraId]: { eraId, completed: true, bestScore: Math.max(prev[eraId]?.bestScore ?? 0, correct) },
        }));
        if (result.streakBroken) {
          await logEvent({ eventType: 'streak_broken', eraId });
        }
        await logEvent({ eventType: 'room_completed', eraId });
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
    }),
    [ready, hearts, xp, streak, unlockedIndex, progress]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
