# art-history-backend

Self-hosted backend for the Art History quiz app. Right now this directory
contains only **Build Roadmap Step 1** from `docs/art-history-app-project-plan.md`:
the content pipeline that pulls a public-domain artwork sample from CC0
museum APIs and normalizes it into the Section 5 data model. Later roadmap
steps (PocketBase, sync, auth, gamification hardening, etc.) are not started
yet — see Section 0 rule 1 of the plan.

## Sources implemented

Section 9 Step 1 names six CC0 sources: Met, Smithsonian, Cleveland, Art
Institute of Chicago, NGA, Getty. Three are wired up:

| Source | Status |
|---|---|
| Metropolitan Museum of Art | ✅ implemented (`src/sources/metSource.js`) |
| Cleveland Museum of Art | ✅ implemented (`src/sources/clevelandSource.js`) |
| Art Institute of Chicago | ✅ implemented (`src/sources/articSource.js`) |
| Smithsonian Open Access | ⏳ not started |
| National Gallery of Art (Washington) | ⏳ not started |
| Getty Open Content | ⏳ not started |

The remaining three are deliberately deferred rather than guessed at, because
each needs a materially different integration, not just a fourth copy of the
same adapter pattern:

- **Smithsonian** requires an API key (from api.data.gov) and its `/search`
  response schema is inconsistent across the many Smithsonian units it
  aggregates (inconsistent nesting under `content.indexedStructured`,
  unreliable date fields) — worth its own adapter with real API-response
  samples to design against, not a best-effort port of the Met/Cleveland shape.
- **NGA Open Data** isn't a query API at all — NGA distributes their open
  data as bulk CSV files (`objects.csv`, `constituents.csv`,
  `published_images.csv`, joined by id) via a GitHub repo, not a REST
  endpoint. That's a batch-download-and-join pipeline, a different shape of
  script than the other five.
- **Getty Open Content** doesn't have a stable, documented public REST API
  comparable to the others; integrating it would mean scraping their
  collection site or working from IIIF manifests, which deserves its own
  design pass rather than being bolted on here.

Adding any of the three means adding `src/sources/<name>Source.js` +
`test/sources/<name>Source.test.js` implementing the same
`{ id, name, toCanonical(raw), fetchRawCandidates(era, { limit, ctx }) }`
interface as the existing sources, then registering it in
`src/sources/index.js`.

## Running the import

```bash
cd backend
node scripts/import_content.js --sources=met,cleveland,artic --limit=40 --out=./data/seed
```

- `--sources` — comma-separated source ids to run (default: all registered
  sources — currently `met,cleveland,artic`). Per-source npm scripts also
  exist: `npm run import:met`, `npm run import:cleveland`, `npm run import:artic`.
- `--limit` — max artworks to keep *per era, per source* (default 40). Each
  source over-samples candidates and filters down, since most records in any
  given museum API aren't flagged public domain, don't have images, or fall
  outside the era's date range. With three sources, a given era can end up
  with close to `3 × limit` artworks.
- `--out` — output directory for the generated JSON files.

Output (`artworks.json`, `artists.json`, `categories.json`,
`artwork_categories.json`) matches the table shapes in Section 5 of the plan
and is meant to seed local SQLite / PocketBase in later roadmap steps.
`artworks.source_api_id` is prefixed per source (e.g. `met:436535`,
`cleveland:129857`) so ids can't collide once merged into one table. These
files are gitignored since they're regenerable derived data, not source.

**Network note:** this script needs outbound HTTPS access to
`collectionapi.metmuseum.org`, `openaccess-api.clevelandart.org`, and
`api.artic.edu`. The sandbox this was built in has a network policy that
blocks all three (`gateway answered 403 to CONNECT`), so every source's
`fetchRawCandidates()` (the actual HTTP calls) is implemented but **not
run against live data yet** — confirmed instead that a blocked/failing
source degrades to "0 kept, keep going" rather than crashing the whole run
(each source's fetch is wrapped and logged independently). The pure mapping
logic (`toCanonical()`, era/style/theme/medium classification, eligibility
filtering) is fully covered by unit tests against fixture API responses,
which don't need network access. Run the script somewhere with that access,
spot-check the output — especially Cleveland and ARTIC, see confidence notes
below — then commit or load the results.

**Confidence notes:** the Met integration carries over from the original,
narrower version of this script essentially unchanged. Cleveland's and
ARTIC's query parameters (`cc0`, `has_image`, `created_after`/`before` for
Cleveland; the `query[term][is_public_domain]=true` bracket-encoded
Elasticsearch filter for ARTIC) match their published API docs from
training knowledge, but haven't been exercised live — see the confidence-note
comments at the top of `clevelandSource.js` and `articSource.js`. Every
record from every source is still re-checked client-side against the era's
date range after fetching (`eraForDateRange` in the runner), so if a query
param doesn't behave exactly as expected, the failure mode is "fewer results
than expected," not a mis-tagged artwork.

## Tests

```bash
cd backend
npm test
```

Uses Node's built-in test runner against fixture API responses in
`test/fixtures/` — no network or dependencies required. Covers:
- each source's `toCanonical()` mapping from that museum's raw response shape
  into the shared canonical item shape (`test/sources/*.test.js`)
- era classification from object date ranges, eligibility filtering (public-domain
  flag + the Section 7 defensive 70-year-since-death copyright check), artist
  dedup, and medium/style/theme heuristics, all source-agnostic (`test/classify.test.js`,
  `test/normalize.test.js`)
- one full source→canonical→artwork+categories run per source as an
  integration check (`test/pipeline.test.js`)

## Scope notes / assumptions made

- **Single-repo layout.** The plan's Section 3 suggests two repos (app +
  backend); this session only has one repo (`Art_History`), so the backend
  lives under `backend/` and the mobile app will live under a sibling
  directory in a later step instead.
- **No question generation.** Section 9 Step 1 only describes pulling +
  tagging artworks, not authoring quiz questions — the `questions` table
  from Section 5 isn't populated by this script.
- **Style/theme tagging is best-effort and conservative.** A style or theme
  category is only attached when a known keyword is found in a source's
  free-text style/period field or title; otherwise the artwork just gets its
  `epoch` and `location` categories. Better than a wrong guess, per Section
  5's tagging intent, but expect gaps to fill in later (manual curation or a
  smarter classifier).
- **Artist identity is deduped by exact display-name string match** across
  all sources (`getOrCreateArtist` in `src/normalize.js`). Works for the
  common case but won't merge the same artist if two museums format the name
  differently (e.g. a suffix or diacritic mismatch). A stable authority id
  (ULAN/Wikidata) would be a more robust key if this becomes a problem once
  real data is pulled.
- **ARTIC artist birth/death years aren't parsed** — the API bundles them
  into a free-text `artist_display` field rather than separate structured
  fields, so `isLikelyStillInCopyright`'s defensive check can't apply to
  ARTIC records the way it does for Met/Cleveland; ARTIC's own
  `is_public_domain` flag is the sole gate for those records. Worth
  revisiting if `artist_display` turns out to be parseable enough once
  there's live data to look at.
