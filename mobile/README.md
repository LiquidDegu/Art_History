# mobile

The Expo (React Native + TypeScript) app shell — Build Roadmap Step 2 from
`../docs/art-history-app-project-plan.md`. Runs entirely against local
seeded data; no backend, no SQLite persistence yet (that's Steps 3-4).

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

Verified working: typechecks clean (`npx tsc --noEmit`) and the full
path → quiz → results → browse loop was exercised end-to-end in a headless
Chromium session (Expo web) with zero console/page errors.

## What's here

```
App.tsx                  root: providers + navigator
src/
  types/content.ts        Section 5 data-model types (Era/Artist/Category/Artwork/Question)
  content/data.ts          hand-curated seed content (see below)
  content/index.ts         selectors (getArtworksByEra, getArtworksByCategory, ...)
  constants/gameBalance.ts hearts/XP defaults (Section 6 — tunable, not final)
  theme.ts                 colors/gradients carried over from the prototype
  state/AppState.tsx       in-memory hearts/xp/streak/unlocked-room context
  navigation/              React Navigation: bottom tabs (Path / Browse), each a native stack
  screens/                 Path, Quiz, Results, BrowseHome, BrowseList, BrowseArtworks, ArtworkDetail
  components/              TopBar, ArtworkCard
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

## Known gaps / next steps

- No local persistence — hearts/XP/streak/unlocked rooms reset on reload.
  That's Build Roadmap Step 3.
- Heart depletion mid-room exits to the path screen (Section 2, point 11)
  but has no wait/streak-freeze/heart-item options yet — those need
  server-side hearts regeneration (Step 6), out of scope for the app shell.
- The path screen's connecting line between room nodes (present in the
  prototype's CSS) isn't ported; the nodes/labels/lock states are.
- Style/theme tags are only attached where I could state them confidently;
  several artworks (e.g. `The School of Athens`, `Discobolus`) have no theme
  tag rather than a guessed one — same conservative-tagging principle
  `backend/README.md` describes for the pipeline.
