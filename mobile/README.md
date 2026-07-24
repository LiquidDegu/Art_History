# mobile

The Expo (React Native + TypeScript) app — Build Roadmap Steps 2-6 from
`../docs/art-history-app-project-plan.md`. Content is local; progress and
analytics events persist to an on-device SQLite database and sync to the
self-hosted PocketBase backend in `../backend/pocketbase/`; an optional
email+password account (Step 5) carries that progress across devices.

## Running it

```bash
cd mobile
npm install
cp .env.example .env.local   # point EXPO_PUBLIC_POCKETBASE_URL at your server
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
completed rooms all survived the reload correctly. The sync queue (below)
was verified the same way against a real local PocketBase instance, not
just against the local database — see `../backend/pocketbase/README.md`
for that testing story.

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
  sync/config.ts            PocketBase server URL (EXPO_PUBLIC_POCKETBASE_URL)
  sync/pocketbaseClient.ts  minimal fetch wrapper around the PocketBase REST API
  sync/syncQueue.ts         syncNow(): batch-uploads unsynced progress/events (Section 4)
  auth/session.ts          in-memory current-token holder (breaks an import cycle, see below)
  auth/authClient.ts        register/login/logout + the claim-or-adopt reconciliation (Section 5)
  state/AppState.tsx       xp/streak/unlocked/progress/session context, backed by SQLite; hearts stay in-memory
  navigation/              React Navigation: bottom tabs (Path / Browse / Account), each a native stack
  screens/                 Path, Quiz, Results, BrowseHome, BrowseList, BrowseArtworks, ArtworkDetail, Account
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

## Sync queue (Build Roadmap Step 4)

`src/sync/syncQueue.ts`'s `syncNow()` pushes local state to PocketBase, per
Section 4's "queue-based... on reconnect, the app batch-uploads the queue
to the backend; server confirms receipt; local queue clears" — triggered
on app boot, on every foreground resume, and right after a room completes
(see the `void syncNow()` calls in `state/AppState.tsx`). There's no
dedicated connectivity-change listener; those three triggers cover
"on reconnect" well enough without adding a network-status dependency.

- **Idempotent by construction, not just by care.** Every record the sync
  queue creates remembers its PocketBase-assigned id locally
  (`user.server_id`, `user_progress.server_id`) and blind-PATCHes that id
  on every later sync instead of searching for it — so a reload never
  creates a duplicate `player`/`player_progress` record. Events reuse their
  local id as `client_event_id`, which has a unique index server-side
  (`backend/pocketbase/pb_migrations/`), so a retried upload that actually
  succeeded the first time gets a `validation_not_unique` error back
  instead of a duplicate row, and the client treats that as success too.
- **Fully offline-safe.** `syncNow()` swallows every error — a dead server,
  no network, a timeout (8s) — and just retries on the next trigger.
  Nothing about play, scoring, or navigation ever waits on it.
- **Verified against a real server, not mocked.** Completing a full room in
  a headless-browser Expo session against a locally-compiled PocketBase
  instance produced exactly the expected `player` row (xp/streak/
  unlocked_era_index), one `player_progress` row, and 8
  `question_answered` + 1 `room_completed` + session events — then a page
  reload in the same browser context re-synced without creating a single
  duplicate record. See `../backend/pocketbase/README.md`.
- **Known gap:** if a device's `server_id` is lost while its `device_uuid`
  survives, `ensurePlayerSynced()` still just skips syncing that device
  rather than guessing. Logging in (below) doesn't fix this specific case —
  it only reconciles at the moment of login, not continuously.

## Auth (Build Roadmap Step 5)

Optional email+password login (`src/auth/authClient.ts`), via PocketBase's
built-in `users` collection — playing without an account works exactly as
it did in Step 4, nothing here is required. The interesting part isn't the
login form, it's what happens to progress when you log in:

- **First login for an account → claim.** The device's local (anonymous)
  `player` record gets its `user` field set to the new account — that
  device's progress *becomes* the account's progress. No data is lost or
  recomputed; the local SQLite state doesn't change at all.
- **Logging into an account that already owns a *different* player record
  (i.e. a second device) → adopt.** Rather than attempting to merge two
  separate anonymous histories — a much bigger feature than Section 4's
  "simple last-write-wins is sufficient" calls for — this device downloads
  the account's existing server state and **overwrites** its local
  xp/streak/progress with it. The second device's pre-login local progress
  is superseded, not combined. `db/database.ts`'s `overwriteFromServer()`
  is the only place local state is written from a server response instead
  of the other way around.
- **Verified with two real devices, not assumed.** Two separate browser
  profiles stood in for two physical devices against the same local
  PocketBase server: device A played a full room, then registered; device
  B (its own local anonymous progress, untouched) logged into the *same*
  account and its Path/Account screens immediately showed device A's exact
  xp/streak/completed-room state. Checking the server directly afterwards
  confirmed exactly one account and exactly one *claimed* player record —
  device B's original anonymous record was left orphaned, not merged or
  duplicated. See `../backend/pocketbase/README.md` for the bug this
  testing caught server-side (a unique-index gotcha with empty relations).
- **expo-secure-store has no web implementation.** It throws rather than
  no-oping when you call it on `expo start --web`, which would otherwise
  crash the app on boot. Every call in `authClient.ts` is wrapped in
  try/catch and degrades to "session doesn't survive a reload" on web
  specifically — native iOS/Android get real Keychain/Keystore-backed
  persistence via the same code path, unaffected.
- **Security model:** see `../backend/pocketbase/README.md`'s "Auth (Step
  5) and the security model" section — claimed records are genuinely
  scoped to their owning account (list/view/update all require
  `@request.auth.id` to match), anonymous ones keep Step 4's accepted
  public-write gap.

## Gamification hardening (Build Roadmap Step 6)

Entirely server-side (`backend/pocketbase/hooks.go`) — nothing in
`mobile/` changed for this step. The app already only ever sends
legitimate xp/streak/progress values (they come from
`db/database.ts`/`db/streak.ts`'s own correct local computation), so
adding server-side validation of *what* a client submits didn't require
touching the client at all — confirmed by re-running the exact same
register → play → adopt end-to-end flow from the Auth section above
against the newly-hardened server and seeing it pass with zero errors,
same as before. See the backend README for what's actually checked and
why an early version of it would have wrongly rejected legitimate
offline-catch-up play.

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
- Session restore on boot calls PocketBase's `auth-refresh`, which extends
  the token; there's no proactive re-auth/retry if that single attempt
  fails for a transient reason (e.g. briefly offline right at launch) —
  the user just appears logged out until they log in again.
