#!/usr/bin/env node
// Build Roadmap Step 1 (project-plan.md Section 9): pulls a public-domain
// artwork sample from the Met Museum Open Access API, normalizes it into the
// artworks/artists/categories/artwork_categories shape from Section 5, and
// writes it out as JSON ready to seed local SQLite / PocketBase in later steps.
//
// Usage:
//   node scripts/import_met.js [--limit=60] [--out=./data/seed]

import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ERAS, MAX_OBJECTS_PER_ERA, REQUEST_CONCURRENCY, REQUEST_DELAY_MS } from "../src/config.js";
import { listObjectIdsByDepartment, getObject, mapWithConcurrency } from "../src/metClient.js";
import { isEligible, getOrCreateArtist, buildArtwork, categoriesForArtwork } from "../src/normalize.js";
import { eraForDateRange, parseYear } from "../src/classify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { limit: MAX_OBJECTS_PER_ERA, out: path.join(__dirname, "..", "data", "seed") };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "limit") args.limit = Number(value);
    if (key === "out") args.out = path.resolve(value);
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEraObjectIds(era, departmentIdCache) {
  const ids = new Set();
  for (const deptId of era.departmentIds) {
    if (!departmentIdCache.has(deptId)) {
      departmentIdCache.set(deptId, await listObjectIdsByDepartment(deptId));
    }
    for (const id of departmentIdCache.get(deptId)) ids.add(id);
  }
  return Array.from(ids);
}

// Evenly-spaced sample so repeated runs are reproducible and don't just skim
// the lowest object IDs in each department.
function sample(ids, limit) {
  if (ids.length <= limit) return ids;
  const step = ids.length / limit;
  return Array.from({ length: limit }, (_, i) => ids[Math.floor(i * step)]);
}

async function run() {
  const { limit, out } = parseArgs(process.argv.slice(2));
  const departmentIdCache = new Map();
  const artistsByName = new Map();
  const categoriesByKey = new Map();
  const artworks = [];
  const artworkCategories = [];

  for (const era of ERAS) {
    console.log(`\n[${era.name}] listing candidate objects...`);
    const allIds = await fetchEraObjectIds(era, departmentIdCache);
    // Over-sample since date filtering + eligibility checks will reject many candidates.
    const candidates = sample(allIds, limit * 4);
    let keptForEra = 0;

    for (let i = 0; i < candidates.length && keptForEra < limit; i += REQUEST_CONCURRENCY) {
      const chunk = candidates.slice(i, i + REQUEST_CONCURRENCY);
      const objects = await mapWithConcurrency(chunk, REQUEST_CONCURRENCY, (id) =>
        getObject(id).catch((err) => {
          console.warn(`  skip ${id}: ${err.message}`);
          return null;
        })
      );
      await sleep(REQUEST_DELAY_MS);

      for (const raw of objects) {
        if (keptForEra >= limit) break;
        if (!raw || !isEligible(raw)) continue;

        const matchedEra = eraForDateRange(parseYear(raw.objectBeginDate), parseYear(raw.objectEndDate));
        if (!matchedEra || matchedEra.id !== era.id) continue;

        const artist = getOrCreateArtist(raw, artistsByName);
        const artwork = buildArtwork(raw, artist);
        artworks.push(artwork);

        for (const cat of categoriesForArtwork(raw, era)) {
          const key = `${cat.type}:${cat.name}`;
          if (!categoriesByKey.has(key)) {
            categoriesByKey.set(key, { id: randomUUID(), type: cat.type, name: cat.name });
          }
          artworkCategories.push({ artwork_id: artwork.id, category_id: categoriesByKey.get(key).id });
        }
        keptForEra++;
      }
    }
    console.log(`[${era.name}] kept ${keptForEra} artworks`);
  }

  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "artworks.json"), JSON.stringify(artworks, null, 2));
  await writeFile(path.join(out, "artists.json"), JSON.stringify(Array.from(artistsByName.values()), null, 2));
  await writeFile(path.join(out, "categories.json"), JSON.stringify(Array.from(categoriesByKey.values()), null, 2));
  await writeFile(path.join(out, "artwork_categories.json"), JSON.stringify(artworkCategories, null, 2));

  console.log(`\nDone. ${artworks.length} artworks written to ${out}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
