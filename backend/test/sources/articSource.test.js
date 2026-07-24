import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toCanonical } from "../../src/sources/articSource.js";
import { eraForDateRange } from "../../src/classify.js";
import { isEligible } from "../../src/normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function fixture(name) {
  return JSON.parse(readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"));
}

test("ARTIC toCanonical maps a public-domain painting into the canonical shape", () => {
  const item = toCanonical(fixture("artic-painting.json"));
  assert.equal(item.sourceId, "artic");
  assert.equal(item.externalId, 27992);
  assert.equal(item.artistName, "Georges Seurat");
  assert.equal(item.imageUrl, "https://www.artic.edu/iiif/2/12a68865-3383-19b4-d3a9-1d9a0198c2b7/full/843,/0/default.jpg");
  assert.equal(item.license.license_type, "CC0");
  assert.equal(isEligible(item), true);
  assert.equal(eraForDateRange(item.dateBegin, item.dateEnd).id, "impressionism");
});

test("ARTIC toCanonical yields no image url and fails eligibility when image_id is missing", () => {
  const raw = { ...fixture("artic-painting.json"), image_id: null };
  const item = toCanonical(raw);
  assert.equal(item.imageUrl, null);
  assert.equal(isEligible(item), false);
});

test("ARTIC toCanonical respects is_public_domain being false", () => {
  const raw = { ...fixture("artic-painting.json"), is_public_domain: false };
  const item = toCanonical(raw);
  assert.equal(isEligible(item), false);
});
