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
backend/pocketbase/     self-hosted PocketBase backend, sync queue, auth + anti-cheat (Steps 4-6)
mobile/                Expo React Native app (Steps 2-7)
```

## Progress

Following the plan's Section 0 rule to build in the order given in Section 9
(Build Roadmap), one step at a time.

### Build Roadmap Step 8 — Testing / TestFlight / Play internal track (blocked on your accounts)

This is the first step in the roadmap that genuinely can't be completed
without you: TestFlight and the Play internal track require an Apple
Developer Program membership and a Google Play Console account,
respectively — both tied to real identity/billing only you can set up.
What's prepared without needing those:

- `mobile/app.json`: real app name/slug, plus placeholder
  `ios.bundleIdentifier`/`android.package` (`com.arthistoryapp.mobile`) —
  **replace with your own reverse-domain identifier** before building for
  real, since these must be globally unique and tied to your developer
  account.
- `mobile/eas.json`: standard EAS Build profiles, following Expo's
  documented schema.
- Confirmed the `eas-cli` tool itself runs from here (`npx eas-cli
  config` reaches the point of requiring `eas login`) — but logging into
  an Expo account and actually running a build needs your involvement, so
  unlike every other piece of infrastructure in this repo, the build
  config is **not verified by actually running it.**

See `mobile/README.md`'s "Building for TestFlight / Play internal track"
section for the exact commands to run once you have the accounts, and
what App Store Connect / Play Console additionally require (screenshots,
privacy policy, content rating) before a build actually reaches testers.

### Build Roadmap Step 7 — Push notifications (done)

Local scheduled notifications (`mobile/src/notifications/streakReminder.ts`),
implementing Section 2's "close app → optional push notification later in
the day if the streak is still unclaimed" — not remote/server-sent push.

- Backgrounding the app with today's streak still unclaimed schedules a
  one-time local reminder for that evening (default 8pm local, tunable);
  completing a room cancels it. No backend changes — this is entirely a
  device-local feature.
- **Deliberately local, not remote:** the actual described need doesn't
  require a server round-trip, push-token registration, or an Expo/EAS
  account. A server-initiated re-engagement campaign to lapsed users would
  be a different, bigger feature Section 9's one-line description doesn't
  ask for.
- **What's verified vs. not:** the code is written directly against
  `expo-notifications`' documented API (checked against the installed
  package's own type definitions, not guessed), and playing a full room
  plus simulated background/foreground transitions in a headless browser
  produced zero errors — but `expo-notifications`' scheduling API has no
  web implementation to actually exercise, and no iOS/Android
  device/simulator was available in this sandbox to confirm a real
  notification fires correctly. This is the one piece of Step 7 that's
  genuinely untested end-to-end; see `mobile/README.md` for detail.

### Build Roadmap Step 6 — Gamification hardening (done)

Section 6's anti-cheat note: "validate and adjust [hearts/streak/XP]
server-side rather than trusting client-submitted values outright." Steps
4-5 made sure a client can only write to its own record; this is what
checks the values it writes are plausible — `backend/pocketbase/hooks.go`,
Go hooks on the `player`/`player_progress` collections (not JS, so it's
compile-checked and lives next to `main.go`).

- **What's checked:** xp can't decrease and only increases in whole
  per-question increments, up to a generous per-sync ceiling; streak can't
  decrease except an explicit reset to 1; `unlocked_era_index` can't
  decrease or exceed the real max; nobody can grant themselves `premium`;
  dates can't be from the future. `player_progress.best_score` can't
  decrease or exceed a generous ceiling.
- **No mobile code changed for this step** — the app was already only
  ever sending values it legitimately computed locally, so hardening what
  the server accepts didn't require touching what the client sends.
  Confirmed by re-running Step 5's full register → play → adopt
  end-to-end test against the newly-hardened server: zero errors, same as
  before.
- **A real design flaw caught by testing this properly, not just writing
  it:** the first version capped `streak`/`unlocked_era_index` at
  "+1 per update." That's wrong — a device offline across several room
  completions or calendar days legitimately jumps by more than 1 in a
  single sync on reconnect. Fixed by tying the allowed `unlocked_era_index`
  jump to the xp gained in the *same* update instead of a flat cap, then
  re-verified both the legitimate catch-up case and the original cheat
  (patching `unlocked_era_index` straight to its max with no xp to show
  for it) resolve correctly. See `backend/pocketbase/README.md`.

### Build Roadmap Step 5 — Auth (done)

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
- Validating *what* an authenticated user's own client is allowed to
  submit (ownership alone doesn't stop implausible values) is Step 6,
  above.

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

### Step 9 — not started, and not recommended yet

Section 9 marks this one "optional, later... once usage justifies
dashboards" — migrating from raw PocketBase events to a self-hosted
PostHog instance. There's no usage yet (the app hasn't launched), so the
plan's own stated trigger condition for this step doesn't hold — building
a self-hosted analytics platform with no users to analyze would be
speculative work the plan itself says to defer, not a gap. Worth
revisiting once Step 8 gets real users onto TestFlight/the internal
track. Monetization (Section 8 of the plan, not to be confused with Build
Roadmap Step 8 above) and the daily play limiter are explicitly deferred
in the plan itself and untouched here.
