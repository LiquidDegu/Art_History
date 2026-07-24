# art-history-backend

Self-hosted backend for the Art History quiz app. Right now this directory
contains only **Build Roadmap Step 1** from `docs/art-history-app-project-plan.md`:
the content pipeline that pulls a public-domain artwork sample from the Met
Museum Open Access API and normalizes it into the Section 5 data model. Later
roadmap steps (PocketBase, sync, auth, gamification hardening, etc.) are not
started yet — see Section 0 rule 1 of the plan.

## Running the import

```bash
cd backend
node scripts/import_met.js --limit=60 --out=./data/seed
```

- `--limit` — max artworks to keep *per era* (default 60). The script
  over-samples candidate objects per era and filters down, since most Met
  objects in a department don't have images, aren't flagged public domain, or
  fall outside the era's date range.
- `--out` — output directory for the generated JSON files.

Output (`artworks.json`, `artists.json`, `categories.json`,
`artwork_categories.json`) matches the table shapes in Section 5 of the plan
and is meant to seed local SQLite / PocketBase in later roadmap steps. These
files are gitignored since they're regenerable derived data, not source.

**Network note:** this script needs outbound HTTPS access to
`collectionapi.metmuseum.org`. The sandbox this was built in has a network
policy that blocked that host (`gateway answered 403 to CONNECT`), so the
import logic is implemented and covered by unit tests against fixtures (see
below) but has **not been run against live Met data yet**. Run it somewhere
with that access, spot-check the output, then commit or load the results.

## Tests

```bash
cd backend
npm test
```

Uses Node's built-in test runner against fixture Met API responses in
`test/fixtures/` — no network or dependencies required. Covers:
- era classification from object date ranges
- eligibility filtering (public-domain flag + the Section 7 defensive
  70-year-since-death copyright check)
- artist dedup, medium/style/theme heuristics, license field stamping

## Scope notes / assumptions made

- **Single-repo layout.** The plan's Section 3 suggests two repos (app +
  backend); this session only has one repo (`Art_History`), so the backend
  lives under `backend/` and the mobile app will live under a sibling
  directory in a later step instead.
- **Source scope.** Only `import_met.js` (Met Museum) is built, matching the
  plan's own Section 11 kickoff prompt. Smithsonian/flagship-work import
  scripts and `pb_migrations/` are later roadmap steps, not this one.
- **No question generation.** Section 9 Step 1 only describes pulling +
  tagging artworks, not authoring quiz questions — the `questions` table
  from Section 5 isn't populated by this script.
- **Style/theme tagging is best-effort and conservative.** A style or theme
  category is only attached when a known keyword is found in Met's `period`
  field or the title/tags; otherwise the artwork just gets its `epoch` and
  `location` categories. Better than a wrong guess, per Section 5's tagging
  intent, but expect gaps to fill in later (manual curation or a smarter
  classifier).
- **Location tagging** uses a single fixed value, `"Metropolitan Museum of
  Art"`, since this script only pulls from the Met. Other museum sources
  (Smithsonian, Cleveland, etc. — Section 7) will need their own location
  values when those scripts are built.
