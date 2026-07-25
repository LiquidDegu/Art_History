/// <reference path="../pb_data/types.d.ts" />

// Same reasoning as 1700000004_add_auth_to_player.js, one hop further
// through the `player` relation: an authenticated user can list/view/
// update their own player_progress rows (via their claimed player
// record), anonymous requests can still create/update unclaimed ones
// (Step 4 behavior, unchanged).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("player_progress");

  collection.listRule = "@request.auth.id != '' && player.user = @request.auth.id";
  collection.viewRule = "@request.auth.id != '' && player.user = @request.auth.id";
  collection.updateRule = "player.user = '' || player.user = @request.auth.id";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("player_progress");
  collection.listRule = null;
  collection.viewRule = null;
  collection.updateRule = "";
  return app.save(collection);
});
