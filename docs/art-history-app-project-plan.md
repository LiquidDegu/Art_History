# Art History Quiz App — Project Plan

**Concept:** A Duolingo/Artly-style mobile app teaching art history through bite-sized lessons and quizzes, covering a broad sweep from Antiquity to Modern/Contemporary art. Offline-capable, self-hosted backend, with analytics to understand engagement.

---

## 0. How to Use This Document (For AI Coding Assistants)

If you are an AI assistant building this app from this document, follow these ground rules:

1. **Build in the order given in Section 9 (Build Roadmap).** Each numbered step depends on the ones before it. Do not skip ahead to later steps (e.g. push notifications, IAP) before earlier ones (content pipeline, app shell) are working.
2. **Do not build anything listed under "Deferred"** in Section 8 (Monetization) or Section 9 (Build Roadmap) unless explicitly asked. This includes the daily play limiter, in-app purchases, and premium-flag gating — the `premium` field should exist in the schema but nothing should check it yet.
3. **Ask before making decisions marked open** in Section 10 (Open Decisions) — don't silently pick an answer to something flagged there.
4. **Treat numeric game-balance values in Section 6 (Gamification Mechanics) as defaults, not final** — they came from the working prototype, and are reasonable starting points, but should be easy to tune (config file or constants module, not hardcoded in multiple places).
5. **The existing prototype (`art-history-app-prototype.jsx`) is a reference for UX/interaction design, not final production code.** It uses inline styles and mock data for a quick demo; production code should follow whatever the app's actual component/styling conventions end up being, not copy the prototype's structure verbatim.
6. **Respect the image rights rules in Section 7** — do not write a content-import script that pulls from non-CC0 sources (e.g. general Wikimedia scraping, Google Images) without the license-verification step described there.
7. **When a step in this document is ambiguous or underspecified for implementation** (e.g. exact folder structure, exact library versions), make a reasonable choice, state the assumption, and proceed — don't block on it. Flag genuinely consequential ambiguities instead of guessing.

A ready-to-paste kickoff prompt for starting a build session is provided at the end of this document (Section 11).

---

## 1. Product Overview

- **Format:** Native-feeling mobile app (iOS + Android)
- **Content scope:** Broad overview across six eras — Antiquity, Medieval, Renaissance, Baroque, Impressionism, Modern/Contemporary
- **Core loop:** Winding "gallery path" of era-rooms → multiple-choice quizzes on artworks/artists/movements → XP, streaks, hearts (Duolingo-style gamification)
- **Platforms:** iOS and Android from one React Native codebase
- **Business model:** Free-first launch — fully unlocked, no paywall — with the backend structured so a premium tier (offline unlock, ~2-5€) can be added later without rework. See Section 8.
- **Content:** A large, richly-tagged artwork collection — every piece can be browsed by epoch, artist, location, and style, not just a single category
- **Key requirements:**
  - Must work fully **offline**
  - Backend should be **self-hosted** (data ownership, cost control, custom sync/anti-cheat logic)
  - Collect **analytics/engagement data** (time spent, accuracy, retention) to understand where users struggle or drop off

A clickable UI prototype already exists (`art-history-app-prototype.jsx`) demonstrating the path screen, quiz screen, and results screen.

---

## 2. Game Description & Gameplay Loop

### Game description

The app frames learning art history as **exploring a museum**. Content is organized into "rooms" — one per epoch (Antiquity, Medieval, Renaissance, Baroque, Impressionism, Modern) — laid out along a winding gallery path, in the same visual language as Duolingo's lesson path. Each room contains a set of short quizzes built from real artworks: identify the artist, the movement, the title, or the era from an image and a short prompt. Progress through rooms is gated (you unlock the next room by clearing the current one), and once a room is unlocked it can also be revisited freely to browse its artworks by artist, style, or location — the path is a route through the collection, not the only way to reach it.

The tone is closer to *browsing a museum with a knowledgeable friend* than sitting an exam: short prompts, one artwork at a time, immediate right/wrong feedback, and a light narrative wrapper ("room," "gallery path") rather than dry academic framing.

### Core gameplay loop

There are two loops running at different time scales, same structure Duolingo uses:

**Macro loop (daily habit loop):**
1. Open app → see current streak, XP total, and path progress
2. Pick up where you left off (next uncleared room) or revisit a cleared room
3. Play one or more quiz rounds
4. Earn XP, extend the streak
5. Close app → optional push notification later in the day if the streak is still unclaimed

**Micro loop (within a single quiz round):**
1. See an artwork (image + short contextual prompt)
2. Choose from multiple-choice options
3. Immediate feedback: correct (green, checkmark, XP awarded) or incorrect (red, correct answer revealed, one heart lost)
4. Progress bar advances
5. Repeat for remaining questions in the room
6. On the last question → results screen (score, XP gained, room marked complete, next room unlocked)

### Step-by-step user flow (full session walkthrough)

1. **App open** → Path screen loads, showing hearts (top-right), streak (flame icon), and XP (star icon) in a persistent top bar
2. **User views the gallery path** — a vertical, winding line of six era-nodes; completed rooms are filled in with their era's color, the current room is highlighted, future rooms are grayed out with a lock icon
3. **User taps an unlocked room** (e.g. "Renaissance") → transitions to the Quiz screen for that era
4. **Quiz screen loads question 1** — artwork image displayed in a framed card, a short prompt beneath it, and 3-4 answer options
5. **User taps an answer:**
   - If correct → option highlights green with a checkmark, XP ticks up
   - If incorrect → option highlights red with an X, correct answer highlights green, one heart is lost
6. **User taps "Continue"** → advances to the next question; progress bar at the top fills accordingly
7. Steps 4-6 repeat for all questions in the room (prototype uses 2 per era; production should have considerably more per room for real replay value)
8. **After the final question**, tapping "Continue" now reads "Finish Room" → transitions to the Results screen
9. **Results screen** shows score (e.g. "4 of 5 correct"), XP gained, and a trophy animation/icon
10. **User taps "Back to path"** → returns to the Path screen; the next room's lock icon is now removed, and the just-completed room shows as filled in
11. **If hearts hit zero mid-room** (not yet built in the prototype, needed for production): quiz pauses, user is offered to wait for heart regeneration, use a streak-freeze/heart item, or exit back to the path without completing
12. **Daily loop continues**: on next app open, if the user played at all "today," the streak is maintained and shown; if a day is missed entirely, the streak resets (unless a streak-freeze was active)

This step-by-step flow is what the current prototype (`art-history-app-prototype.jsx`) already implements end-to-end for a single room, minus the heart-depletion pause and the daily streak-reset logic, which are backend-dependent (Section 6) and not yet wired up.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Mobile app | React Native (Expo) | One codebase for iOS + Android; matches prototype's React logic |
| Local storage | SQLite (`expo-sqlite` or WatermelonDB) | Enables full offline functionality |
| Backend | **PocketBase**, self-hosted | Single Go binary bundling SQLite, auth, and a REST/realtime API — lightweight to run solo on a small VPS |
| Backend (alt.) | Self-hosted Supabase (Docker Compose: Postgres + auth + storage) | More powerful/heavier option if the app grows significantly |
| Content source | Met Museum Open Access API, Rijksmuseum API | Free, public-domain, high-res artwork images with metadata — no copyright risk, no manual entry |
| Auth | PocketBase's built-in auth | Self-hosted, no third-party vendor lock-in |
| Notifications | Expo Notifications | Streak-reminder push notifications |
| Analytics (future upgrade) | Self-hosted PostHog (Docker Compose) | Funnels/retention dashboards once user base justifies it; not needed on day one |

**Suggested repo structure** (two repos, since mobile app and backend deploy independently):
```
art-history-app/              (Expo React Native app)
  app/                        screens: Path, Quiz, Results
  components/
  db/                         local SQLite schema + queries
  sync/                       upload/download queue logic
  content/                    seeded local content bundle (or fetched on first run)
  constants/                  game-balance values (hearts, XP, etc.) — see Section 6

art-history-backend/          (self-hosted PocketBase)
  pb_migrations/               schema migrations (artworks, categories, users, events, etc.)
  scripts/
    import_met.js              content pipeline: pull + tag + license-check from Met API
    import_smithsonian.js
    import_flagship.js         manual curated list from Section 7
  pb_hooks/                    server-side validation (heart/XP/streak anti-cheat logic)
```

---

## 4. Architecture: Offline-First + Self-Hosted Sync

**Principle:** Offline support and self-hosting are separate concerns, solved at different layers.

- **Offline** = a local SQLite database on-device, pre-seeded with all content (eras, artworks, questions, cached images). All quiz-taking and browsing works with zero connection.
- **Self-hosted sync** = only two kinds of data ever need to leave the device:
  1. **Progress data** (XP, streak, completions) — synced to prevent cheating and enable cross-device continuity
  2. **Analytics events** — synced for engagement insight
- **Sync protocol:** queue-based. Events/progress changes are written locally with a device UUID + timestamp. On reconnect, the app batch-uploads the queue to the PocketBase backend; server confirms receipt; local queue clears. Conflict resolution: simple last-write-wins is sufficient at this scale.

---

## 5. Data Model

Artworks need to appear in more than one browsing context at once — an artwork is simultaneously "Renaissance," "by Leonardo da Vinci," "held in the Louvre," and "High Renaissance style." A single `era_id` foreign key can't express that, so categories are modeled as tags via a join table instead.

### Content tables (local + server, seeded from museum APIs)
- `artworks` — id (uuid), title (string), artist_id (uuid, fk), year (int, nullable — many works have uncertain dates), image_url (string), source_api_id (string), medium (string enum: painting/sculpture/fresco/etc.), license_type (string enum: CC0/PD/CC-BY), license_url (string), rights_source (string)
- `artists` — id (uuid), name (string), birth_year (int, nullable), death_year (int, nullable), nationality (string)
- `categories` — id (uuid), type (string enum: epoch/style/location/theme), name (string)
- `artwork_categories` — artwork_id (uuid, fk), category_id (uuid, fk) *(composite key, many-to-many join)*
- `questions` — id (uuid), artwork_id (uuid, fk), prompt (string), options (string array, length 3-4), correct_index (int), type (string enum: e.g. identify_artist/identify_title/identify_movement)

`license_type`, `license_url`, and `rights_source` exist so every self-hosted image has an auditable trail of where it came from and what rights apply — important once images are downloaded and re-served from your own storage rather than hotlinked from the museum.

**Category types, for reference:**
| Type | Example values |
|---|---|
| `epoch` | Antiquity, Medieval, Renaissance, Baroque, Impressionism, Modern |
| `style` | Fauvism, Cubism, High Renaissance, Rococo, Surrealism |
| `location` | Louvre, Uffizi, Rijksmuseum, Met, Prado |
| `theme` | Portrait, Landscape, Religious, Mythological, Still Life |

The "gallery path" (epoch-based progression) becomes just one *view* over this data — filtering `artwork_categories` where type=`epoch`. Browsing "by artist," "by style," or "by location" are the same query with a different filter, no separate content system needed.

### User tables (server, synced from device)
- `users` — id (uuid), xp (int, default 0), streak (int, default 0), hearts (int, default 3), last_active_date (date), premium (bool, default false — unused until Section 8's deferred work begins)
- `user_progress` — user_id (uuid, fk), era_id (uuid, fk → categories where type=epoch), completed (bool), best_score (int)

### Analytics table (server, synced from device queue)
- `events` — id (uuid), device_uuid (string), event_type (string enum: session_start/session_end/question_answered/room_completed/streak_broken/etc.), era_id (uuid, fk, nullable), artwork_id (uuid, fk, nullable), correct (bool, nullable), time_to_answer_ms (int, nullable), timestamp (datetime)

**Event types to track:**
- Session start/end + session length
- Per-question: correct/incorrect, time-to-answer, which era/artwork
- Lesson/room completions, and drop-off point if a session ends mid-quiz
- Streak breaks and restarts (key churn signal)
- Repeated misses on the same artwork (candidate for spaced repetition)

---

## 6. Gamification Mechanics

- **Hearts** — start at 3 per room attempt; lose one per wrong answer; regenerate over time (exact regen rate is an open tuning decision — Duolingo uses ~1 per 4-5 hours as a reference point)
- **Daily streak** — increments once per calendar day with at least one completed quiz round; a forgiving "streak freeze" item protects one missed day
- **XP** — 15 XP per correct answer as a starting default (matches the prototype); room-completion bonus XP not yet defined — worth adding once there's real usage data on what feels rewarding
- **Spaced repetition** — resurface previously-missed artworks in later lessons
- **Unlockable "rooms"** — matches the museum/gallery framing; each era unlocks after the previous is completed

These specific numbers (hearts=3, XP=15/correct) are defaults carried over from the prototype, not final game-balance decisions — implement them as adjustable constants/config, not hardcoded magic numbers scattered through the codebase.

Anti-cheat note: since hearts/streak/XP determine progression, validate and adjust these server-side rather than trusting client-submitted values outright.

---

## 7. Image Sourcing & Rights

Not legal advice — general landscape to navigate, and worth a lawyer's confirmation before public launch, especially since the app is monetized.

**Core issue:** a painting being centuries old and public domain doesn't automatically mean every *photograph* of it is public domain — that depends on whose rights statement covers the specific image file, and it varies by jurisdiction (US and EU generally treat faithful photos of 2D public-domain art as itself public domain; other jurisdictions are murkier).

**Sources with explicit, unambiguous rights for self-hosted commercial reuse (CC0):**
- Metropolitan Museum of Art — Open Access
- Smithsonian Open Access
- Cleveland Museum of Art — Open Access
- Art Institute of Chicago API
- National Gallery of Art (Washington) — Open Access
- Getty Open Content Program
- Rijksmuseum — downloadable, but verify per-object terms (not blanket CC0)

**Sources needing per-file verification, not blanket use:**
- Wikimedia Commons — licenses vary file-by-file (CC0 / CC-BY / PD-Art tag); check each file's license, don't assume site-wide CC0

**Artworks to exclude or license explicitly:**
- Anything by an artist who died less than ~70 years ago (EU) or first published after 1928 (US, cutoff shifts yearly) — most 20th/21st-century "Modern" era pieces fall here and are very likely still under copyright

**Data hygiene practice:** every self-hosted image should carry its `license_type` (e.g. CC0, PD, CC-BY), `license_url`, and `rights_source` (which museum/API it came from) in the `artworks` table, so the collection stays auditable as it grows — and so anything added later that turns out to be wrongly licensed can be found and pulled quickly.

**Flagship/iconic works (Mona Lisa, David, etc.) — a separate, manual track:**
The most recognizable works are the hardest case, not the easiest, for two reasons:
1. **2D vs. 3D matters.** A faithful photo of a flat painting (e.g. Mona Lisa) generally carries no new copyright of its own — it's public domain along with the painting. A photo of a 3D sculpture (e.g. David) usually *does* get its own new copyright (angle/lighting/framing are creative choices), independent of the sculpture's own public-domain status.
2. **Italy has an additional legal layer beyond copyright.** Italian cultural heritage law lets Italian institutions control commercial use of images of works in their collections regardless of copyright status — actively enforced against commercial products featuring David, the Birth of Venus, and similar works.

Approach: don't pull these through the same bulk CC0 API pipeline. Build a short manually-curated exception list, and for each work either (a) source a genuinely old public-domain photograph already established as PD (common for 2D works like Mona Lisa via Wikimedia), or (b) for Italian-held sculptures, use only long-established PD reproductions rather than recent museum photography, or (c) pursue explicit licensing for the small number of true "hero" pieces if it's worth the cost.

---

## 8. Monetization: Free-First Launch, Premium-Ready Backend

**Decision:** Launch fully free, with everything unlocked — no daily play limiter, no paywall, no in-app purchase at v1. This avoids app store IAP review complexity, receipt validation work, and pricing decisions up front, and sidesteps the need to decide exactly what's "premium-worthy" content before the app even has users.

**What still gets built now, so this stays easy to add later:**
- The `users` table keeps a `premium` boolean field from day one (defaults to `false` for everyone) — even though nothing checks it yet.
- The offline-mode and full-library-access logic gets built as features of the app itself, not gated behind the premium flag — so later, "gating" premium is just adding an `if (user.premium)` check in front of code that already works, not writing new functionality under time pressure.
- Category/content structure (Section 5) already supports partitioning a subset as "free" vs "full" later, since it's tag-based — no schema change needed to introduce a free/premium split down the line.

**Deferred until there's a reason to revisit (e.g. hosting costs justify it, or there's a user base to test pricing with):**
- Daily play limiter
- In-app purchase integration (StoreKit / Play Billing)
- Server-side validation of the premium flag against store receipts
- Deciding the exact free-vs-premium content split and price point (~2-5€ range noted earlier, not locked in)

---

## 9. Build Roadmap

1. **Content pipeline** — script to pull and normalize a large artwork set from CC0 museum APIs (Met, Smithsonian, Cleveland, Art Institute of Chicago, NGA, Getty), recording `license_type`/`license_url`/`rights_source` per image, then tagging each piece across epoch/style/location/theme into the `artwork_categories` structure
2. **App shell** — build the RN app against local seeded data only (no backend yet), refining the prototype's path/quiz/result flow, plus browse-by-category views (artist, style, location)
3. **Local persistence** — wire up SQLite for offline progress and event logging
4. **Self-hosted backend** — stand up PocketBase on a VPS; build the sync queue (progress + analytics) between app and server
5. **Auth** — add PocketBase auth for cross-device continuity
6. **Gamification hardening** — move heart/streak/XP validation logic server-side
7. **Push notifications** — streak-reminder nudges via Expo
8. **Testing** — TestFlight (iOS) / internal track (Android) with real users
9. **Analytics upgrade (optional, later)** — migrate from raw PocketBase events to self-hosted PostHog once usage justifies dashboards

**Deferred (not part of v1, revisit once there's a user base):**
- In-app purchase integration (StoreKit / Play Billing) and server-side premium-flag validation
- Daily play limiter
- Deciding the free-vs-premium content split and final price point

---

## 10. Open Decisions / Things to Revisit

- Whether device UUIDs ever get tied to a real user identity (affects privacy policy scope)
- Event granularity vs. noise — logging at question-level is more useful than session-level only, but generates more data to store/sync
- Supabase vs. PocketBase — revisit if the app's needs grow beyond PocketBase's feature set
- Exact size/curation bar for the free-tier artwork subset vs. full premium collection
- Legal review of image rights before public launch, especially for any non-CC0 or Wikimedia-sourced images added to the library
- Final curated list of flagship/iconic works and their individually-verified image sources (Mona Lisa, David, etc.)
- Free-vs-premium split and pricing, and daily play limiter design — deliberately deferred until there's a user base to inform the decision

---

## 11. Kickoff Prompt (copy-paste to start a build session)

```
I'm building the app described in the attached project plan (art-history-app-project-plan.md).
Please read the whole document first, including Section 0 (how to use this document).

Start with Build Roadmap Step 1 only: the content pipeline script that pulls artwork data
from the Met Museum Open Access API, records license_type/license_url/rights_source per
the Data Model in Section 5, and tags each piece into artwork_categories across epoch/
style/location/theme per Section 5's category types.

Do not start on the app shell, backend, or any later roadmap step yet — just this script.
Ask me before making any decision listed in Section 10 (Open Decisions), and don't build
anything listed as "Deferred" in Sections 8 or 9.
```

Adjust the roadmap step number in this prompt as you move through Section 9 in later sessions.

---

*Companion file: `art-history-app-prototype.jsx` — clickable React prototype of the path/quiz/results UI.*
