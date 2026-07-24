import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES } from "../src/sources/index.js";
import { eraForDateRange } from "../src/classify.js";
import { isEligible, getOrCreateArtist, buildArtwork, categoriesForArtwork } from "../src/normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(path.join(__dirname, "fixtures", name), "utf8"));
}

const CASES = [
  { source: "met", fixtureFile: "renaissance-painting.json", expectedEra: "renaissance" },
  { source: "cleveland", fixtureFile: "cleveland-painting.json", expectedEra: "impressionism" },
  { source: "artic", fixtureFile: "artic-painting.json", expectedEra: "impressionism" },
];

for (const { source, fixtureFile, expectedEra } of CASES) {
  test(`full pipeline runs end-to-end for a ${source} fixture`, () => {
    const raw = fixture(fixtureFile);
    const item = SOURCES[source].toCanonical(raw);
    assert.equal(isEligible(item), true);

    const era = eraForDateRange(item.dateBegin, item.dateEnd);
    assert.equal(era.id, expectedEra);

    const artist = getOrCreateArtist(item, new Map());
    const artwork = buildArtwork(item, artist);
    assert.equal(artwork.source_api_id.startsWith(`${source}:`), true);
    assert.ok(artwork.license_type);

    const categories = categoriesForArtwork(item, era);
    assert.ok(categories.some((c) => c.type === "epoch" && c.name === era.name));
    assert.ok(categories.some((c) => c.type === "location"));
  });
}
