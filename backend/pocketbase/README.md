# backend/pocketbase

Self-hosted backend (Build Roadmap Steps 4-5 from
`../../docs/art-history-app-project-plan.md`): a [PocketBase](https://pocketbase.io)
server that receives the mobile app's synced progress and analytics
events, with optional email+password auth (Step 5) so progress can follow
a person across devices. Content (artworks/artists/categories/questions)
stays in the mobile app's bundled `content/data.ts` module — per Section 4
of the plan, only two kinds of data ever need to leave the device:
progress and analytics events.

## Running it

```bash
cd backend/pocketbase
cp .env.example .env    # then edit PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD
docker compose up -d --build
```

That's it — on first boot the container compiles nothing further (the
image already has a compiled `pocketbase` binary baked in), applies
`pb_migrations/*.js` automatically, and bootstraps the superuser account
from your `.env`. The dashboard is at `http://localhost:8090/_/`, the REST
API at `http://localhost:8090/api/`.

Point the mobile app at it by setting `EXPO_PUBLIC_POCKETBASE_URL` — see
`../../mobile/.env.example`.

## Why this is compiled from source, not a downloaded release binary

The standard way to self-host PocketBase in Docker is to `curl` a prebuilt
binary from its GitHub Releases in the Dockerfile. This sandbox's network
policy blocks that (and Docker Hub image pulls in general — same
`gateway answered 403` pattern as the museum APIs in `../README.md`), but
**`proxy.golang.org` is reachable**, so `main.go` + `go.mod` compiling
PocketBase from source via `go build` was the one approach that could
actually be built *and tested* here rather than written blind:

- `main.go` (`pocketbase.New()` + the `jsvm`/`migratecmd` plugins) was
  compiled and run directly on the host (`go build .` then `./pocketbase
  serve`), confirmed healthy via `/api/health`.
- Every collection in `pb_migrations/` was applied against that real,
  running instance and re-verified from scratch after each fix — this
  wasn't a one-shot "it compiled" check. One real bug this caught:
  PocketBase's `required: true` on a `number` field rejects `0` as blank,
  which would have broken every new player's starting xp/streak/
  unlocked_era_index of 0 had it shipped un-tested.
- The full mobile sync queue (`../../mobile/src/sync/`) was exercised
  end-to-end against this same local server from a real headless-browser
  Expo session: completing a room created/updated the `player` and
  `player_progress` records and synced all 8 `question_answered` events
  plus `room_completed`, and reloading the page reused the same server
  record (no duplicates) rather than creating a second one.
- Step 5's auth/claim/adopt flow was tested the same way, with two
  separate browser profiles standing in for two devices: device A played
  a room, then registered — its anonymous progress got linked to the new
  account. Device B (its own local anonymous progress, never played)
  logged into that same account and *adopted* device A's server state
  (120 XP, streak 1, Antiquity complete) rather than merging — confirmed
  by checking the actual PocketBase records afterwards: exactly one
  account, exactly one *claimed* player record, device B's original
  anonymous record left untouched and orphaned. This also caught a real
  bug: a naive `UNIQUE INDEX` on `player.user` broke after the *second*
  anonymous player record, because PocketBase stores an unset relation as
  `""`, not SQL `NULL` — unlike `NULL`, multiple `""`s collide under a
  plain unique index. Fixed with a partial index
  (`WHERE user != ''`), the same pattern PocketBase's own built-in
  `_superusers.email` uniqueness uses.
- **Not verified here:** the Dockerfile itself. `docker build` gets
  through parsing and starts pulling `golang:1.25-alpine`/`alpine:3.20`,
  then fails on the same blocked-registry error as everything else
  Docker-related in this sandbox. The Dockerfile is standard multi-stage
  Go-build boilerplate wrapping the exact `main.go`/`pb_migrations` that
  were tested directly — low risk, but genuinely untested as an image
  build. Worth a real `docker compose up --build` on first use somewhere
  with normal network access, which this README's instructions assume.
- Building from source rather than downloading a release binary has one
  incidental benefit beyond working around this sandbox's network policy:
  it cross-builds for both amd64 and arm64 with no extra Dockerfile logic,
  since `go build` just targets whatever platform Docker's buildx is
  building for.

## Schema (`pb_migrations/`)

Five migrations, applied in order:

| Migration | Maps to Section 5 | Notes |
|---|---|---|
| `1700000001` `player` | `users` table (xp/streak/last_active_date/premium) | Named `player`, not `users` — PocketBase reserves `users` for its own built-in auth collection. `hearts` is present for schema fidelity but nothing syncs it yet (stays client-only, see `../../mobile/README.md`). |
| `1700000002` `player_progress` | `user_progress` table | Relation to `player`, unique on `(player, era_id)`. |
| `1700000003` `events` | `events` table | Unique on `client_event_id` — the mobile app's local event id, reused as an idempotency key so a retried upload can't create a duplicate. |
| `1700000004` add auth to `player` | — | Adds a nullable `user` relation to PocketBase's built-in `users` auth collection, a partial-unique index (`WHERE user != ''`, see above), and auth-aware list/view/update rules. |
| `1700000005` auth rules on `player_progress` | — | Same ownership rules, one hop through the `player` relation. |

## Auth (Step 5) and the security model

Email+password auth via PocketBase's built-in `users` collection
(`/api/collections/users/records` to register, `/auth-with-password` to
log in — both plain PocketBase REST, nothing custom). `player` records
stay anonymous (`user` unset) until a device's owner logs in, at which
point the mobile app either **claims** the local device's record (first
login ever for that account) or **adopts** the account's existing
server-side state (logging into an account that already owns a *different*
player record, e.g. a second device) — see
`../../mobile/src/auth/authClient.ts`'s module comment and
`../../mobile/README.md` for the full claim-vs-adopt reasoning, which
follows Section 4's "simple last-write-wins is sufficient" stance rather
than attempting a real multi-device progress merge.

**Current access rules, and what's still open:**
- Anonymous (unclaimed) `player`/`player_progress` records: `create`/
  `update` are public, `list`/`view` are superuser-only. Same accepted gap
  as Step 4 — anyone who can reach the server can write *an* anonymous
  record, but can't enumerate or read others'.
- Claimed records: `update` requires `@request.auth.id` to match the
  owning user; `list`/`view` require the same, so a logged-in user can see
  and sync only their own claimed record, never anyone else's.
- **Still not done:** server-side validation of *what* an authenticated
  user submits (Step 6 — e.g. nothing stops a logged-in user's client from
  PATCHing an implausible xp value onto their own claimed record right
  now, only from touching anyone else's). If a device's local `server_id`
  is lost while its `device_uuid` survives, the sync queue still just
  skips that device — same gap as Step 4, not addressed by adding auth.

## Local development without Docker

Everything above was tested by running the Go server directly, which also
works as a normal dev loop if you have Go installed:

```bash
cd backend/pocketbase
go run . serve
# separate terminal, once:
go run . superuser upsert you@example.com yourpassword
```

## pb_hooks/

Empty for now (just `.gitkeep`). Step 6 (server-side gamification
hardening) is where custom validation hooks belong — e.g. rejecting a
`player_progress` update whose `best_score` jumped by more than a room's
question count allows.
