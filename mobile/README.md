# mobile

The Expo (React Native + TypeScript) app — Build Roadmap Steps 2-3 from
`../docs/art-history-app-project-plan.md`. Content is local (no backend
yet — that's Step 4), but progress and analytics events now persist to an
on-device SQLite database instead of resetting on every reload.

## Running it

```bash
cd mobile
npm install
npx expo start --web    # or --ios / --android with a simulator/device
```

If your network blocks `exp.host`/`api.expo.dev` (as this sandbox's did),
add `--offline` to skip Expo's online dependency/version checks:

```bash
npx expo start --web --offline
```

Verified working: typechecks clean (`npx tsc --noEmit`), `npm test` passes
(pure-logic + schema tests — see "Testing SQLite logic" below), and the
full path → quiz → results → browse loop, **including a hard page reload
mid-session**, was exercised end-to-end in a headless Chromium session
(Expo web) with zero console/page errors — XP, streak, and unlocked/
completed rooms all survived the reload correctly.

## What's here

```
App.tsx                  root: providers + navigator + loading gate
metro.config.js           .wasm asset support + COOP/COEP headers for expo-sqlite on web (see below)
src/
  types/content.ts        Section 5 data-model types (Era/Artist/Category/Artwork/Question)
  types/db.ts              local SQLite row types (User/Progress/Event)
  content/data.ts          hand-curated seed content (see below)
  content/index.ts         selectors (getArtworksByEra, getArtworksByCategory, ...)
  constants/gameBalance.ts hearts/XP defaults (Section 6 — tunable, not final)
  theme.ts                 colors/gradients carried over from the prototype
  db/schema.ts             SQLite schema: user, user_progress, events (Section 5)
  db/streak.ts             pure daily-streak-rollover logic (Section 6/2) — unit tested
  db/database.ts           expo-sqlite access layer: init, user/progress CRUD, event logging
  state/AppState.tsx       xp/streak/unlocked/progress context, backed by SQLite; hearts stay in-memory
  navigation/              React Navigation: bottom tabs (Path / Browse), each a native stack
  screens/                 Path, Quiz, Results, BrowseHome, BrowseList, BrowseArtworks, ArtworkDetail
  components/              TopBar, ArtworkCard
test/                      Node --test suite for db/schema.ts and db/streak.ts (see below)
```

## Seed content: why hand-curated, not pipeline output

`backend/`'s Step 1 pipeline (Met/Cleveland/ARTIC) hasn't run against live
APIs yet — this sandbox's network policy blocks all three museum APIs (see
`backend/README.md`). Rather than block the app shell on that, `content/data.ts`
hand-authors 48 real, well-documented public-domain artworks (8 per era)
with real artists, dates, locations, styles, and themes, plus one quiz
question each — enough to build and test every screen against genuine
content instead of Lorem Ipsum.

Two things this data intentionally does **not** do, both per Section 7 of
the project plan:
- **No hotlinked images.** No individual source image has been
  license-verified here, so `imageUrl` is left `null` and the UI renders an
  era-tinted gradient card with a caption instead — same placeholder
  approach the reference prototype already uses. Swap in real
  `imageUrl`/`licenseType`/`licenseUrl` once either the Step 1 pipeline runs
  against live data, or (for these specific flagship works) Section 7's
  manual per-image verification track is done.
- **Copyright cutoff enforced in code, not just by author care.** `data.ts`'s
  `artist()` helper throws if a deceased artist's death year is less than
  `COPYRIGHT_SAFE_YEARS` (70) years ago — the same defensive rule
  `backend/src/config.js` uses. This is why the Modern era pulls from Munch,
  Klimt, Kandinsky, Mondrian, etc. rather than the prototype's Picasso
  ("Guernica," 1937) — Picasso died in 1973, inside the 70-year window.

## Local persistence (Build Roadmap Step 3)

`src/db/` wires up `expo-sqlite`, seeded on first launch. What persists and
what doesn't:

- **Persisted:** `xp`, `streak`, `unlocked_era_index`, per-era
  `user_progress` (`completed`, `best_score`), and an `events` log —
  matching the "User tables" and "Analytics table" in Section 5. Content
  tables (`artworks`/`artists`/`categories`/`questions`) deliberately stay
  in the bundled `content/data.ts` module rather than moving into SQLite —
  see that section's note below on why.
- **Not persisted (by design):** `hearts`. Section 6 defines hearts as "3
  per room attempt," not a value that needs to survive a restart — they
  reset locally each time a room is entered. Server-side hearts
  regeneration is Step 6 (gamification hardening), out of scope here.
- **Daily streak rule** (`db/streak.ts`, unit tested): increments once per
  calendar day with a completed room, resets to 1 on a missed day (no
  streak-freeze item exists yet — Section 6 mentions one but it isn't
  built), stays flat on a second completion the same day. This replaced
  Step 2's placeholder logic, which incorrectly incremented the streak on
  every room completion regardless of date.
- **Event logging**, per Section 5's "Event types to track": `session_start`
  /`session_end` (via React Native's `AppState` background/foreground
  events — `session_end` also carries the current era/artwork as a
  drop-off marker if the app backgrounds mid-quiz), `question_answered`
  (correct/incorrect + time-to-answer), `room_completed`, and
  `streak_broken`. No sync queue yet — events accumulate locally until Step
  4 adds the backend to sync them to.
- **`device_uuid`** is generated once (`expo-crypto`'s `randomUUID()`) and
  stored in the `user` table; Section 10 flags whether it's ever tied to a
  real identity as an open decision this doesn't touch.

### expo-sqlite on web needs `metro.config.js`

`expo-sqlite`'s web backend (`wa-sqlite`, compiled to WASM, run in a Web
Worker) doesn't work out of the box with Expo's default Metro config: `.wasm`
isn't in Metro's default asset extensions, and the WASM module needs
`Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` response headers
to use `SharedArrayBuffer`. `metro.config.js` adds both. Native (iOS/Android)
doesn't need this — it uses expo-sqlite's native module directly.

### Testing SQLite logic without a device

This sandbox can run the app in a browser (via `expo start --web`) but not
an iOS/Android simulator, and the SQLite logic itself is the part of Step 3
worth verifying precisely — so `db/streak.ts` and `db/schema.ts` are kept
free of Expo-specific imports and unit tested directly with Node's built-in
`node:sqlite` and test runner:

```bash
npm test
```

This checks the schema is valid SQLite, that the `INSERT OR IGNORE`/`MAX()`
upsert patterns `database.ts` relies on behave as assumed, and exhaustively
covers the daily-streak rollover (same day / next day / gap / first-ever
play). The actual `expo-sqlite`-backed `database.ts` was still verified for
real, end-to-end, in the browser (see "Running it" above) — the Node tests
cover the logic Expo's web SQLite backend made slower to iterate on there.

## Known gaps / next steps

- Heart depletion mid-room exits to the path screen (Section 2, point 11)
  but has no wait/streak-freeze/heart-item options yet — those need
  server-side hearts regeneration (Step 6), out of scope for the app shell.
- The path screen's connecting line between room nodes (present in the
  prototype's CSS) isn't ported; the nodes/labels/lock states are.
- Style/theme tags are only attached where I could state them confidently;
  several artworks (e.g. `The School of Athens`, `Discobolus`) have no theme
  tag rather than a guessed one — same conservative-tagging principle
  `backend/README.md` describes for the pipeline.
- No sync queue — events and progress live only on-device until Step 4
  stands up the backend to sync against.
