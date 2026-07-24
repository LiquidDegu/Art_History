import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isEligible, getOrCreateArtist, buildArtwork, categoriesForArtwork } from "../src/normalize.js";
import { eraForDateRange, parseYear } from "../src/classify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixture(name) {
  return JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
}

test("eligible public-domain Renaissance painting normalizes correctly", () => {
  const raw = fixture("renaissance-painting.json");
  assert.equal(isEligible(raw), true);

  const era = eraForDateRange(parseYear(raw.objectBeginDate), parseYear(raw.objectEndDate));
  assert.equal(era.id, "renaissance");

  const artists = new Map();
  const artist = getOrCreateArtist(raw, artists);
  assert.equal(artist.name, "Sandro Botticelli");
  assert.equal(artist.birth_year, 1445);
  assert.equal(artist.death_year, 1510);

  const artwork = buildArtwork(raw, artist);
  assert.equal(artwork.license_type, "CC0");
  assert.equal(artwork.source_api_id, "999001");
  assert.equal(artwork.medium, "painting");
  assert.equal(artwork.artist_id, artist.id);

  const categories = categoriesForArtwork(raw, era);
  assert.ok(categories.some((c) => c.type === "epoch" && c.name === "Renaissance"));
  assert.ok(categories.some((c) => c.type === "location" && c.name === "Metropolitan Museum of Art"));
  assert.ok(categories.some((c) => c.type === "style" && c.name === "Early Renaissance"));
  assert.ok(categories.some((c) => c.type === "theme" && c.name === "Portrait"));
});

test("ancient sculpture with no listed artist falls back to 'Unknown'", () => {
  const raw = fixture("ancient-sculpture.json");
  assert.equal(isEligible(raw), true);

  const era = eraForDateRange(parseYear(raw.objectBeginDate), parseYear(raw.objectEndDate));
  assert.equal(era.id, "ancient");

  const artist = getOrCreateArtist(raw, new Map());
  assert.equal(artist.name, "Unknown");

  const artwork = buildArtwork(raw, artist);
  assert.equal(artwork.medium, "sculpture");
});

test("artist who died recently is excluded even when the source flags public domain", () => {
  const raw = fixture("modern-recent-artist.json");
  assert.equal(isEligible(raw), false);
});

test("object not flagged public domain is excluded", () => {
  const raw = { ...fixture("renaissance-painting.json"), isPublicDomain: false };
  assert.equal(isEligible(raw), false);
});

test("artist lookups dedupe by name across artworks", () => {
  const raw = fixture("renaissance-painting.json");
  const artists = new Map();
  const first = getOrCreateArtist(raw, artists);
  const second = getOrCreateArtist(raw, artists);
  assert.equal(first.id, second.id);
  assert.equal(artists.size, 1);
});
