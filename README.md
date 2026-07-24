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

### Build Roadmap Step 2 — App shell (in progress)

An Expo (React Native + TypeScript) app in `mobile/` implementing the full
path → quiz → results loop from the reference prototype, plus new
browse-by-artist/style/location/theme views the prototype didn't have.
Runs entirely against local seeded data — no backend or persistence yet.

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
- **Verified working:** typechecks clean, and the full loop (answer
  questions → lose hearts / gain XP → unlock next room → browse an artist's
  work → view an artwork's detail) was exercised end-to-end in a headless
  browser session with zero console errors. See `mobile/README.md` for how
  to run it, including the `--offline` flag needed if your network blocks
  Expo's own telemetry/update-check hosts.
- **Not done yet (explicitly out of scope for this step):** local
  persistence (state resets on reload), the heart-depletion wait/streak-freeze
  options from Section 2, and the path screen's decorative connecting line.

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

Steps 3–9 of the roadmap, in order: local SQLite persistence, self-hosted
PocketBase backend + sync queue, auth, server-side gamification hardening,
push notifications, TestFlight/internal testing, and the optional PostHog
analytics upgrade. Monetization (Section 8) and the daily play limiter are
explicitly deferred in the plan itself and untouched here.
