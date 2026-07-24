/// <reference path="../pb_data/types.d.ts" />

// Section 5's "user_progress" table: per-era completion + best score.
migrate((app) => {
  const player = app.findCollectionByNameOrId("player");

  const collection = new Collection({
    name: "player_progress",
    type: "base",
    fields: [
      {
        name: "player",
        type: "relation",
        required: true,
        collectionId: player.id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      {
        // Mirrors mobile's EraId strings (ancient/medieval/renaissance/
        // baroque/impressionism/modern) — kept as free text rather than a
        // fixed `select` enum so a new era doesn't need a server migration.
        name: "era_id",
        type: "text",
        required: true,
        min: 1,
        max: 64,
      },
      {
        name: "completed",
        type: "bool",
      },
      {
        // Not `required: true` — see player collection's xp field comment;
        // same 0-is-not-blank PocketBase gotcha applies here too.
        name: "best_score",
        type: "number",
        onlyInt: true,
        min: 0,
      },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_player_progress_player_era ON player_progress (player, era_id)"],
    // Same reasoning as the player collection: superuser-only list/view,
    // since the sync client always operates on a record id it already
    // remembers locally rather than searching for one.
    listRule: null,
    viewRule: null,
    createRule: "",
    updateRule: "",
    deleteRule: null,
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("player_progress");
  return app.delete(collection);
});
