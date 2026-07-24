import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toCanonical } from "../../src/sources/clevelandSource.js";
import { eraForDateRange } from "../../src/classify.js";
import { isEligible } from "../../src/normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));
}

test("Cleveland toCanonical maps a CC0 painting into the canonical shape", () => {
  const item = toCanonical(fixture("cleveland-painting.json"));
  assert.equal(item.sourceId, "cleveland");
  assert.equal(item.externalId, 129857);
  assert.equal(item.artistName, "Claude Monet");
  assert.equal(item.artistBirthYear, 1840);
  assert.equal(item.artistDeathYear, 1926);
  assert.equal(item.license.license_type, "CC0");
  assert.equal(item.locationName, "Cleveland Museum of Art");
  assert.equal(isEligible(item), true);
  assert.equal(eraForDateRange(item.dateBegin, item.dateEnd).id, "impressionism");
});

test("Cleveland toCanonical treats a non-CC0 share status as not public domain", () => {
  const raw = { ...fixture("cleveland-painting.json"), share_license_status: "In Copyright" };
  const item = toCanonical(raw);
  assert.equal(item.isPublicDomain, false);
  assert.equal(isEligible(item), false);
});

test("Cleveland toCanonical handles a record with no creators", () => {
  const raw = { ...fixture("cleveland-painting.json"), creators: [] };
  const item = toCanonical(raw);
  assert.equal(item.artistName, null);
});
