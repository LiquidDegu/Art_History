# Art History

A Duolingo-style mobile app teaching art history through bite-sized lessons
and quizzes, from Antiquity to Modern/Contemporary.

## Documentation

- [`docs/art-history-app-project-plan.md`](docs/art-history-app-project-plan.md)
  — the full product plan: product overview, gameplay loop, tech stack, data
  model, image-rights rules, monetization strategy, and the build roadmap
  this repo follows step by step.
- [`docs/art-history-app-prototype.jsx`](docs/art-history-app-prototype.jsx)
  — a reference UI prototype of the path/quiz/results screens. Per the
  plan's Section 0, this is a feel/interaction reference only, not
  production code to copy directly.

## Layout

```
docs/                 product plan + reference UI prototype
backend/               content pipeline (Step 1)
backend/pocketbase/     self-hosted PocketBase backend, sync queue target + auth (Steps 4-5)
mobile/                Expo React Native app (Steps 2-5)
```

## Progress

Following the plan's Section 0 rule to build in the order given in Section 9
(Build Roadmap), one step at a time.

### Build Roadmap Step 5 — Auth (in progress)

Optional email+password login (PocketBase's built-in `users` collection),
so progress can follow a person across devices instead of staying pinned
to one anonymous `device_uuid` forever.

- **Claim vs. adopt, not merge:** logging into an account for the first
  time ever links the current device's anonymous progress to it (claim);
  logging into an account that already owns a *different* device's
  progress downloads and overwrites the current device's local state with
  the account's instead of trying to merge two separate histories —
  matching Section 4's "simple last-write-wins is sufficient" rather than
  building real multi-device merge, which the plan doesn't ask for.
- **Ownership is enforced server-side, not just assumed client-side:**
  once claimed, a `player`/`player_progress` record's `list`/`view`/
  `update` rules require `@request.auth.id` to match its owner — checked
  by testing an unauthenticated request against a *just-claimed* record
  and confirming it's rejected, not by reading the rule and assuming.
- **Verified with two simulated devices against a real server:** device A
  played a room and registered; device B (separate local anonymous
  progress, never played) logged into the same account and immediately
  showed device A's exact xp/streak/completed-room state on its own Path
  screen. The server afterwards showed exactly one account and exactly
  one claimed player record — device B's original record left untouched,
  not merged or duplicated.
- **One real bug this testing caught:** a naive `UNIQUE INDEX` on the new
  `player.user` relation broke after the *second* anonymous player record
  ever created, because PocketBase stores an unset relation as `""`, not
  SQL `NULL` — unlike `NULL`, repeated `""`s collide under a plain unique
  index. Fixed with a partial index (`WHERE user != ''`). See
  `backend/pocketbase/README.md`.
- **Still open (Step 6's job, not this one's):** validating *what* an
  authenticated user's own client is allowed to submit — right now
  ownership is enforced, plausibility isn't.

### Build Roadmap Step 4 — Self-hosted backend + sync queue (done)

A self-hosted [PocketBase](https://pocketbase.io) server (`backend/pocketbase/`)
now receives the mobile app's progress and analytics events, per Section 4:
"only two kinds of data ever need to leave the device: progress data...
and analytics events."

- **Runs as a single `docker compose up -d --build`** (once `.env` is filled
  in from `.env.example`) — the image compiles PocketBase from source and
  bakes in the binary, so there's nothing left to build at container start;
  it applies its schema migrations and bootstraps the superuser account
  automatically.
- **Schema** (`backend/pocketbase/pb_migrations/`): `player` (Section 5's
  `users` table, renamed — PocketBase reserves `users` for its own built-in
  auth collection and this step is pre-auth), `player_progress` (Section
  5's `user_progress`), and `events`, with a unique index on the client's
  local event id so a retried upload can't create a duplicate.
- **Mobile sync queue** (`mobile/src/sync/`): batch-uploads xp/streak/
  unlocked-room progress and unsynced events on app boot, on foreground
  resume, and after each room completion; fully offline-safe (every
  failure is swallowed and retried later, nothing about play ever waits on
  it); idempotent by remembering each record's server-assigned id locally
  rather than searching for it.
- **Known, documented security gap at the time:** no auth yet, so
  collection write rules were public rather than scoped to a real
  identity. `list`/`view` were locked to superusers in the meantime, so at
  least nothing was publicly enumerable. Step 5, above, is what actually
  closes this for claimed accounts; anonymous (not-yet-logged-in) records
  keep the same accepted gap by design.
- **Verified working, not just written:** this sandbox's network policy
  blocks GitHub Releases and Docker Hub the same way it blocks the museum
  APIs (see Step 1 below) — but `proxy.golang.org` is reachable, so
  PocketBase was compiled from source and actually run locally. Every
  migration was applied against that real server and re-verified from
  scratch after fixes (one real bug caught: PocketBase's `required: true`
  rejects a numeric `0`, which would have broken every new player's
  starting xp/streak of 0). The full mobile→server sync flow was then
  exercised end-to-end in a headless-browser Expo session against that
  same local server — completing a room produced the exact expected
  server-side records, and reloading the page re-synced without creating
  duplicates. Only the Dockerfile's `docker build` itself couldn't be
  verified here (same blocked-registry issue) — see
  `backend/pocketbase/README.md` for the full story and what's still
  worth checking on first real use.

### Build Roadmap Step 3 — Local persistence (done)

`mobile/`'s xp/streak/unlocked-room progress and analytics events now
persist to an on-device SQLite database (`mobile/src/db/`) instead of
resetting on every reload.

- **Persisted:** xp, streak, unlocked-room index, and per-era
  completed/best_score (Section 5's "User tables"). Hearts stay in-memory
  by design — Section 6 defines them as "3 per room attempt," not a value
  that needs to survive a restart.
- **Daily streak rule, done properly:** increments once per calendar day
  with a completed room, hard-resets to 1 on a missed day (no streak-freeze
  item exists yet), stays flat on a same-day replay — replacing Step 2's
  placeholder (which incremented on every room completion regardless of
  date). This is unit tested (`mobile/test/streak.test.ts`) against Node's
  built-in SQLite/test runner, independent of Expo, since it's the part of
  this step most worth getting exactly right.
- **Analytics events logged locally**, per Section 5's event list:
  session_start/session_end (via app background/foreground, with the
  in-progress era/artwork as a drop-off marker), question_answered
  (correct + time-to-answer), room_completed, streak_broken. Synced to the
  backend as of Step 4, below.
- **Verified working:** typechecks clean, `npm test` passes (schema +
  streak-rollover logic), and — the real test for this step — completing a
  room, then doing a hard page reload, was exercised in a headless browser
  session and confirmed xp/streak/completed-room state survived correctly,
  with zero console errors. See `mobile/README.md` for the `metro.config.js`
  change this needed (expo-sqlite's web backend needs `.wasm` asset support
  + COOP/COEP headers that Expo's default Metro config doesn't set).

### Build Roadmap Step 2 — App shell (done)

An Expo (React Native + TypeScript) app in `mobile/` implementing the full
path → quiz → results loop from the reference prototype, plus new
browse-by-artist/style/location/theme views the prototype didn't have.

- **Screens:** Path (gallery path of era nodes), Quiz (multi-question rooms
  with progress bar, heart loss, XP), Results, and a Browse tab (Artists /
  Styles / Locations / Themes → artwork list → artwork detail).
- **Content:** since the Step 1 pipeline hasn't run against live museum
  APIs yet (see below), `mobile/src/content/data.ts` hand-curates 48 real,
  well-documented public-domain artworks (8 per era) with real facts and one
  quiz question each, applying the same 70-years-since-death copyright rule
  as `backend/src/config.js`. No images are hotlinked — Section 7 requires
  per-image license verification this session couldn't do, so artwork cards
  render as era-tinted gradient placeholders (same approach the prototype
  itself uses) until real, rights-checked images are wired in.
- **Not done (explicitly out of scope for this step, picked up in Step 3):**
  local persistence, the heart-depletion wait/streak-freeze options from
  Section 2, and the path screen's decorative connecting line.

### Build Roadmap Step 1 — Content pipeline (in progress)

A script (`backend/scripts/import_content.js`) pulls public-domain artworks
from CC0 museum APIs and normalizes them into the Section 5 data model
(`artworks` / `artists` / `categories` / `artwork_categories`), tagged across
epoch, style, location, and theme.

- **Sources wired up:** Metropolitan Museum of Art, Cleveland Museum of Art,
  Art Institute of Chicago — 3 of the 6 CC0 sources Section 9 names.
- **Deferred, not guessed at:** Smithsonian (needs an API key + has an
  inconsistent per-unit schema), National Gallery of Art (distributes bulk
  CSV, not a query API), Getty Open Content (no stable public REST API).
  Each needs a genuinely different integration shape; see
  `backend/README.md` for details.
- **Architecture:** a source-agnostic core (`backend/src/classify.js`,
  `backend/src/normalize.js`) operates on a shared canonical item shape;
  each museum's API lives behind its own adapter in `backend/src/sources/`
  implementing `{ toCanonical, fetchRawCandidates }`.
- **Section 7 compliance:** every artwork is stamped with `license_type` /
  `license_url` / `rights_source`, and a work is excluded if its artist died
  less than ~70 years ago — defense in depth on top of each source's own
  public-domain flag.
- **Tests:** 26 unit tests (`backend/test/`) against fixture API responses —
  no network needed. Covers era/style/theme/medium classification,
  eligibility filtering, artist dedup, and one full pipeline run per source.
- **Known limitation:** this sandbox's network policy blocks all three
  source APIs, so the pipeline hasn't been run against live data yet — only
  against fixtures. Confirmed it fails gracefully per-source (logs and
  continues) rather than crashing. See `backend/README.md` for how to run it
  for real once outbound access is available, plus per-source confidence
  notes on query-parameter accuracy for Cleveland and ARTIC.

### Not started yet

Steps 6–9 of the roadmap, in order: server-side gamification hardening,
push notifications, TestFlight/internal testing, and the optional PostHog
analytics upgrade. Monetization (Section 8) and the daily play limiter are
explicitly deferred in the plan itself and untouched here.
