/// <reference path="../pb_data/types.d.ts" />

// Build Roadmap Step 5 (Auth): links a `player` record to PocketBase's
// built-in `users` auth collection, so progress made anonymously (Step 4)
// can be "claimed" by a real account and followed across devices. `user`
// is nullable — most player records stay anonymous forever, which is
// fine; a record only gets a `user` once its device's owner registers or
// logs in (see mobile/src/auth/).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const player = app.findCollectionByNameOrId("player");

  player.fields.add(
    new Field({
      name: "user",
      type: "relation",
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: false,
    })
  );

  // A plain UNIQUE index here would break after the *second* anonymous
  // player record: PocketBase stores an unset single-relation as an empty
  // string, not SQL NULL, and unlike NULL, multiple ""s collide under a
  // normal unique index. The `WHERE user != ''` partial index (the same
  // pattern PocketBase's own built-in _superusers.email index uses) is
  // what actually gets "unique once claimed, unconstrained while
  // anonymous" — confirmed by testing against a real server, not assumed:
  // the naive version failed on the second anonymous player/create.
  player.indexes.push("CREATE UNIQUE INDEX idx_player_user ON player (user) WHERE user != ''");

  // `@request.auth.id` is "" on an unauthenticated request, and an unclaimed
  // player's `user` is also "" — so `user = @request.auth.id` alone would
  // let anonymous requests match anonymous records here too. The explicit
  // `@request.auth.id != ""` guard is what keeps list/view genuinely
  // "your claimed record only," not "any unclaimed record."
  player.listRule = "@request.auth.id != '' && user = @request.auth.id";
  player.viewRule = "@request.auth.id != '' && user = @request.auth.id";
  // No such gap for updateRule: it's fine for `user = @request.auth.id` to
  // require auth here, since the `user = ''` branch is what still lets an
  // unauthenticated request update an unclaimed record (Step 4's original
  // anonymous-sync behavior), which is intentionally kept.
  player.updateRule = "user = '' || user = @request.auth.id";

  return app.save(player);
}, (app) => {
  const player = app.findCollectionByNameOrId("player");
  player.fields.removeByName("user");
  player.listRule = null;
  player.viewRule = null;
  player.updateRule = "";
  return app.save(player);
});
