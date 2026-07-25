#!/bin/sh
# Bootstraps the first superuser from env vars (so "docker compose up" is
# enough — no separate manual setup step) before handing off to whatever
# command was passed (normally `serve`). Safe to run on every container
# start: `superuser upsert` is idempotent, it just resets the password if
# the account already exists.
set -e

if [ -n "$PB_ADMIN_EMAIL" ] && [ -n "$PB_ADMIN_PASSWORD" ]; then
  /pb/pocketbase --dir=/pb/pb_data superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD"
else
  echo "PB_ADMIN_EMAIL/PB_ADMIN_PASSWORD not set — skipping superuser bootstrap." >&2
  echo "Create one manually: docker compose exec pocketbase pocketbase --dir=/pb/pb_data superuser upsert <email> <password>" >&2
fi

exec /pb/pocketbase --dir=/pb/pb_data "$@"
