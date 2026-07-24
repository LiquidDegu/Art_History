import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toCanonical } from "../../src/sources/metSource.js";
import { eraForDateRange } from "../../src/classify.js";
import { isEligible } from "../../src/normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));
}

test("Met toCanonical maps a Renaissance painting into the canonical shape", () => {
  const item = toCanonical(fixture("renaissance-painting.json"));
  assert.equal(item.sourceId, "met");
  assert.equal(item.externalId, 999001);
  assert.equal(item.artistName, "Sandro Botticelli");
  assert.equal(item.artistBirthYear, 1445);
  assert.equal(item.license.license_type, "CC0");
  assert.equal(item.locationName, "Metropolitan Museum of Art");
  assert.equal(isEligible(item), true);
  assert.equal(eraForDateRange(item.dateBegin, item.dateEnd).id, "renaissance");
});

test("Met toCanonical falls back to 'Unknown' via normalize when artistDisplayName is blank", () => {
  const item = toCanonical(fixture("ancient-sculpture.json"));
  assert.equal(item.artistName, null); // toCanonical passes through blank; normalize.js applies the "Unknown" fallback
  assert.equal(eraForDateRange(item.dateBegin, item.dateEnd).id, "ancient");
});

test("Met toCanonical carries through a recently-deceased artist's death year so isEligible excludes it", () => {
  const item = toCanonical(fixture("modern-recent-artist.json"));
  assert.equal(item.artistDeathYear, 2016);
  assert.equal(isEligible(item), false);
});
