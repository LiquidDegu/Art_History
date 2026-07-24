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
docs/     product plan + reference UI prototype
backend/  self-hosted backend + content pipeline (Step 1)
mobile/   Expo React Native app shell (Step 2)
```

## Progress

Following the plan's Section 0 rule to build in the order given in Section 9
(Build Roadmap), one step at a time.

### Build Roadmap Step 3 — Local persistence (in progress)

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
  (correct + time-to-answer), room_completed, streak_broken. No sync queue
  yet — that's Step 4.
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

Steps 4–9 of the roadmap, in order: self-hosted PocketBase backend + sync
queue, auth, server-side gamification hardening, push notifications,
TestFlight/internal testing, and the optional PostHog analytics upgrade.
Monetization (Section 8) and the daily play limiter are explicitly deferred
in the plan itself and untouched here.
