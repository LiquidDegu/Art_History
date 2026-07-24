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
backend/  self-hosted backend + content pipeline (Step 1 so far)
```

## Progress

Following the plan's Section 0 rule to build in the order given in Section 9
(Build Roadmap), one step at a time.

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

Steps 2–9 of the roadmap, in order: app shell (RN/Expo, path/quiz/result
screens + browse-by-category views), local SQLite persistence, self-hosted
PocketBase backend + sync queue, auth, server-side gamification hardening,
push notifications, TestFlight/internal testing, and the optional PostHog
analytics upgrade. Monetization (Section 8) and the daily play limiter are
explicitly deferred in the plan itself and untouched here.
