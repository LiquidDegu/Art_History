// Tunable game-balance defaults, per project-plan.md Section 6: "implement
// these as adjustable constants/config, not hardcoded magic numbers scattered
// through the codebase." Values are the prototype's defaults, not final.

export const HEARTS_START = 3;
export const XP_PER_CORRECT = 15;

// Section 2: "close app → optional push notification later in the day if
// the streak is still unclaimed." Local device time, 24h clock.
export const STREAK_REMINDER_HOUR = 20;
