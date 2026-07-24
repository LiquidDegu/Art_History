import { ERAS, STYLE_KEYWORDS, THEME_KEYWORDS, MEDIUM_MAP, COPYRIGHT_SAFE_YEARS } from "./config.js";

export function parseYear(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Picks the era whose range contains the object's midpoint date, breaking ties
// by whichever era overlaps the object's own date span the most.
export function eraForDateRange(begin, end) {
  if (begin === null && end === null) return null;
  const mid = begin !== null && end !== null ? (begin + end) / 2 : begin ?? end;

  let best = null;
  let bestOverlap = -Infinity;
  for (const era of ERAS) {
    if (mid < era.dateBegin || mid > era.dateEnd) continue;
    const overlap = Math.min(end ?? mid, era.dateEnd) - Math.max(begin ?? mid, era.dateBegin);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = era;
    }
  }
  return best;
}

export function isLikelyStillInCopyright(artistEndDate) {
  const deathYear = parseYear(artistEndDate);
  if (deathYear === null) return false; // unknown death year: defer to the source API's own flag
  return new Date().getFullYear() - deathYear < COPYRIGHT_SAFE_YEARS;
}

export function detectStyle(period) {
  if (!period) return null;
  const lower = period.toLowerCase();
  return STYLE_KEYWORDS.find((kw) => lower.includes(kw.toLowerCase())) ?? null;
}

export function detectTheme({ title, tags }) {
  const haystack = [title, ...(tags || []).map((t) => t.term)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) return theme;
  }
  return null;
}

export function detectMedium(mediumString) {
  if (!mediumString) return "other";
  const found = MEDIUM_MAP.find((m) => m.match.test(mediumString));
  return found ? found.value : "other";
}
