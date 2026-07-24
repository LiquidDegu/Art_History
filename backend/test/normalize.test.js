import { test } from "node:test";
import assert from "node:assert/strict";
import { isEligible, getOrCreateArtist, buildArtwork, categoriesForArtwork } from "../src/normalize.js";
import { ERAS } from "../src/config.js";

const LICENSE = { license_type: "CC0", license_url: "https://example.org/cc0", rights_source: "Example Museum" };

function makeItem(overrides = {}) {
  return {
    sourceId: "met",
    externalId: 123,
    isPublicDomain: true,
    imageUrl: "https://example.org/image.jpg",
    title: "Portrait of a Lady",
    artistName: "Sandro Botticelli",
    artistBirthYear: 1445,
    artistDeathYear: 1510,
    artistNationality: "Italian",
    dateBegin: 1478,
    dateEnd: 1482,
    mediumText: "Tempera on panel",
    styleText: "Early Renaissance",
    themeText: "Portrait of a Lady",
    license: LICENSE,
    locationName: "Example Museum",
    ...overrides,
  };
}

test("isEligible requires public domain flag, an image, and an id", () => {
  assert.equal(isEligible(makeItem()), true);
  assert.equal(isEligible(makeItem({ isPublicDomain: false })), false);
  assert.equal(isEligible(makeItem({ imageUrl: null })), false);
  assert.equal(isEligible(makeItem({ externalId: null })), false);
});

test("isEligible excludes artists who died too recently even if flagged public domain", () => {
  assert.equal(isEligible(makeItem({ artistDeathYear: 2016 })), false);
});

test("getOrCreateArtist dedupes by display name and reuses the same record", () => {
  const artists = new Map();
  const a = getOrCreateArtist(makeItem(), artists);
  const b = getOrCreateArtist(makeItem({ sourceId: "cleveland", externalId: 456 }), artists);
  assert.equal(a.id, b.id);
  assert.equal(artists.size, 1);
});

test("getOrCreateArtist falls back to 'Unknown' when no artist name is given", () => {
  const artist = getOrCreateArtist(makeItem({ artistName: null }), new Map());
  assert.equal(artist.name, "Unknown");
});

test("buildArtwork stamps license fields and prefixes source_api_id by source", () => {
  const item = makeItem();
  const artist = getOrCreateArtist(item, new Map());
  const artwork = buildArtwork(item, artist);
  assert.equal(artwork.source_api_id, "met:123");
  assert.equal(artwork.license_type, "CC0");
  assert.equal(artwork.medium, "painting");
  assert.equal(artwork.artist_id, artist.id);
});

test("categoriesForArtwork always includes epoch and location, plus style/theme when detected", () => {
  const era = ERAS.find((e) => e.id === "renaissance");
  const categories = categoriesForArtwork(makeItem(), era);
  assert.ok(categories.some((c) => c.type === "epoch" && c.name === "Renaissance"));
  assert.ok(categories.some((c) => c.type === "location" && c.name === "Example Museum"));
  assert.ok(categories.some((c) => c.type === "style" && c.name === "Early Renaissance"));
  assert.ok(categories.some((c) => c.type === "theme" && c.name === "Portrait"));
});

test("categoriesForArtwork omits style/theme when nothing matches", () => {
  const era = ERAS.find((e) => e.id === "ancient");
  const categories = categoriesForArtwork(makeItem({ styleText: "", themeText: "Untitled object" }), era);
  assert.equal(categories.length, 2);
});
