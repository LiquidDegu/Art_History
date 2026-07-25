// Schema for Build Roadmap Step 3 (local persistence). Deliberately a
// subset of project-plan.md Section 5's "User tables" + "Analytics table" —
// content tables (artworks/artists/categories/questions) stay in the
// bundled src/content/data.ts module for now rather than moving into
// SQLite, since Step 1's live pipeline output isn't available to seed a
// content DB from yet (see mobile/README.md).

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT,
  device_uuid TEXT NOT NULL,
  premium INTEGER NOT NULL DEFAULT 0,
  unlocked_era_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_progress (
  era_id TEXT PRIMARY KEY,
  completed INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  device_uuid TEXT NOT NULL,
  event_type TEXT NOT NULL,
  era_id TEXT,
  artwork_id TEXT,
  correct INTEGER,
  time_to_answer_ms INTEGER,
  timestamp TEXT NOT NULL
);
`;
