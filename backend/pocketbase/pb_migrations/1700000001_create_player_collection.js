/// <reference path="../pb_data/types.d.ts" />

// Section 5's "users" table (xp/streak/last_active_date/premium), adapted:
// named "player" instead of "users" because PocketBase reserves the name
// "users" for its own built-in auth collection (email+password required),
// and Step 4 is deliberately pre-auth — records here are anonymous,
// keyed by device_uuid, matching Section 4's sync-queue description. Step 5
// (Auth) will decide how a device's "player" record gets claimed by/linked
// to a real account; not decided here, per Section 0's build-in-order rule.
//
// `hearts` is included for schema fidelity with Section 5, but nothing
// syncs it yet — mobile/README.md documents hearts as staying client-only
// until Step 6 (server-side gamification hardening).
migrate((app) => {
  const collection = new Collection({
    name: "player",
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
        // Not `required: true` on purpose — PocketBase's "required"
        // validation treats a numeric 0 as blank, and 0 is every new
        // player's legitimate starting xp. `min: 0` is the real constraint.
        name: "xp",
        type: "number",
        onlyInt: true,
        min: 0,
      },
      {
        name: "streak",
        type: "number",
        onlyInt: true,
        min: 0,
      },
      {
        name: "hearts",
        type: "number",
        onlyInt: true,
        min: 0,
      },
      {
        name: "last_active_date",
        type: "date",
        required: false,
      },
      {
        name: "unlocked_era_index",
        type: "number",
        onlyInt: true,
        min: 0,
      },
      {
        name: "premium",
        type: "bool",
      },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_player_device_uuid ON player (device_uuid)"],
    // Pre-auth, so there's no `@request.auth` to scope by — anyone with a
    // device_uuid can create/update. Accepted, documented gap; see
    // backend/pocketbase/README.md and Step 5/6.
    //
    // list/view stay superuser-only (null) rather than public: the sync
    // client never needs to look records up by filter — it remembers the
    // server-assigned id from its own create response and blind-PATCHes
    // that from then on — so there's no reason to let anyone enumerate or
    // read other devices' records too.
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: "",
    deleteRule: null,
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("player");
  return app.delete(collection);
});
