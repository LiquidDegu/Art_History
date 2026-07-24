# backend/pocketbase

Self-hosted backend (Build Roadmap Step 4 from `../../docs/art-history-app-project-plan.md`):
a [PocketBase](https://pocketbase.io) server that receives the mobile app's
synced progress and analytics events. Content (artworks/artists/categories/
questions) stays in the mobile app's bundled `content/data.ts` module — per
Section 4 of the plan, only two kinds of data ever need to leave the
device: progress and analytics events.

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

Three collections, applied in order:

| Collection | Maps to Section 5 | Notes |
|---|---|---|
| `player` | `users` table (xp/streak/last_active_date/premium) | Named `player`, not `users` — PocketBase reserves `users` for its own built-in auth collection (email+password required), and this step is deliberately pre-auth. `hearts` is present for schema fidelity but nothing syncs it yet (stays client-only, see `../../mobile/README.md`). |
| `player_progress` | `user_progress` table | Relation to `player`, unique on `(player, era_id)`. |
| `events` | `events` table | Unique on `client_event_id` — the mobile app's local event id, reused as an idempotency key so a retried upload can't create a duplicate. |

## Known limitation: no auth yet (Step 5)

Every collection's `create`/`update` rules are public (empty-string rule,
not `null`) — there's no `@request.auth` to scope by pre-auth, so anyone
who can reach the server can write *a* record. This is an accepted,
deliberate gap for this step, not an oversight:

- `list`/`view` are locked to superusers on every collection, so at least
  no one can enumerate or read other devices' data — the sync client never
  needs to look records up by filter anyway, since it remembers the
  server-assigned id from its own create response and blind-PATCHes that
  from then on.
- Real per-device write authorization needs Step 5 (Auth) to exist at all;
  Step 6 (gamification hardening) is where server-side validation of
  submitted xp/streak values against what's actually plausible belongs —
  right now the server trusts whatever the client sends.
- If a device's local `server_id` gets lost while its `device_uuid`
  survives (e.g. a partial local data reset), the sync queue currently just
  skips that device rather than guessing — see the comment in
  `../../mobile/src/sync/syncQueue.ts`. Reconciling that properly needs
  Step 5 too.

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
