/// <reference path="../pb_data/types.d.ts" />

// Section 5's "events" analytics table. Not linked to `player` via a
// relation field on purpose: events are keyed by device_uuid directly
// (matching Section 4's "written locally with a device UUID + timestamp"
// sync-queue description) so logging never blocks on a player record
// existing yet.
migrate((app) => {
  const collection = new Collection({
    name: "events",
    type: "base",
    fields: [
      {
        name: "device_uuid",
        type: "text",
        required: true,
        min: 1,
        max: 64,
      },
      {
        name: "event_type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["session_start", "session_end", "question_answered", "room_completed", "streak_broken"],
      },
      {
        name: "era_id",
        type: "text",
        required: false,
        max: 64,
      },
      {
        name: "artwork_id",
        type: "text",
        required: false,
        max: 128,
      },
      {
        name: "correct",
        type: "bool",
      },
      {
        name: "time_to_answer_ms",
        type: "number",
        required: false,
        onlyInt: true,
        min: 0,
      },
      {
        // Client-side event time (when it happened on-device), distinct
        // from the record's own `created` autodate (when the server
        // received the synced upload) — the two can differ once a device
        // has been offline for a while.
        name: "timestamp",
        type: "date",
        required: true,
      },
      {
        // The locally-generated event id (mobile/src/db/database.ts
        // logEvent's Crypto.randomUUID()), reused as the idempotency key
        // for the sync queue: a retried upload of the same local event
        // hits this unique index instead of creating a duplicate record.
        name: "client_event_id",
        type: "text",
        required: true,
        min: 1,
        max: 64,
      },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_events_client_event_id ON events (client_event_id)"],
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: null,
    deleteRule: null,
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("events");
  return app.delete(collection);
});
