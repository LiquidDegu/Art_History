import React, { createContext, useContext, useMemo, useState } from 'react';
import { HEARTS_START, XP_PER_CORRECT } from '../constants/gameBalance';
import { ERAS } from '../content';
import type { EraId } from '../types/content';

// In-memory app state only — Step 2 scope is the app shell against local
// seeded data. Persisting this across launches (SQLite) is Build Roadmap
// Step 3, not done here.

interface AppState {
  hearts: number;
  xp: number;
  streak: number;
  /** Index into ERAS of the highest unlocked room. */
  unlockedIndex: number;
  loseHeart: () => void;
  resetHearts: () => void;
  completeRoom: (eraId: EraId, correct: number, total: number) => number;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [hearts, setHearts] = useState(HEARTS_START);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlockedIndex, setUnlockedIndex] = useState(0);

  const value = useMemo<AppState>(
    () => ({
      hearts,
      xp,
      streak,
      unlockedIndex,
      loseHeart: () => setHearts((h) => Math.max(0, h - 1)),
      resetHearts: () => setHearts(HEARTS_START),
      completeRoom: (eraId, correct, _total) => {
        const gained = correct * XP_PER_CORRECT;
        setXp((x) => x + gained);
        setStreak((s) => s + 1);
        const eraIndex = ERAS.findIndex((e) => e.id === eraId);
        setUnlockedIndex((u) => Math.max(u, Math.min(eraIndex + 1, ERAS.length - 1)));
        return gained;
      },
    }),
    [hearts, xp, streak, unlockedIndex]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
