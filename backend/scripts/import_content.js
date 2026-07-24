#!/usr/bin/env node
// Build Roadmap Step 1 (project-plan.md Section 9): pulls a public-domain
// artwork sample from CC0 museum APIs, normalizes it into the
// artworks/artists/categories/artwork_categories shape from Section 5, and
// writes it out as JSON ready to seed local SQLite / PocketBase in later steps.
//
// Usage:
//   node scripts/import_content.js [--sources=met,cleveland,artic] [--limit=40] [--out=./data/seed]

import { writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ERAS, MAX_OBJECTS_PER_ERA_PER_SOURCE } from "../src/config.js";
import { SOURCES, ALL_SOURCE_IDS } from "../src/sources/index.js";
import { isEligible, getOrCreateArtist, buildArtwork, categoriesForArtwork } from "../src/normalize.js";
import { eraForDateRange } from "../src/classify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    sources: ALL_SOURCE_IDS,
    limit: MAX_OBJECTS_PER_ERA_PER_SOURCE,
    out: path.join(__dirname, "..", "data", "seed"),
  };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "sources") args.sources = value.split(",").map((s) => s.trim());
    if (key === "limit") args.limit = Number(value);
    if (key === "out") args.out = path.resolve(value);
  }
  return args;
}

async function run() {
  const { sources: sourceIds, limit, out } = parseArgs(process.argv.slice(2));
  const sources = sourceIds.map((id) => {
    const source = SOURCES[id];
    if (!source) throw new Error(`Unknown source "${id}". Known sources: ${ALL_SOURCE_IDS.join(", ")}`);
    return source;
  });

  const ctx = { cache: new Map() }; // shared across eras/sources for cross-era caching (see metSource/articSource)
  const artistsByName = new Map();
  const categoriesByKey = new Map();
  const artworks = [];
  const artworkCategories = [];
  const sourceTotals = Object.fromEntries(sources.map((s) => [s.id, 0]));

  for (const era of ERAS) {
    console.log(`\n=== ${era.name} ===`);
    let keptForEra = 0;

    for (const source of sources) {
      let rawCandidates;
      try {
        rawCandidates = await source.fetchRawCandidates(era, { limit, ctx });
      } catch (err) {
        console.warn(`[${source.name}] fetch failed, skipping this era: ${err.message}`);
        continue;
      }

      let keptForSource = 0;
      for (const raw of rawCandidates) {
        if (keptForSource >= limit) break;
        const item = source.toCanonical(raw);
        if (!isEligible(item)) continue;

        const matchedEra = eraForDateRange(item.dateBegin, item.dateEnd);
        if (!matchedEra || matchedEra.id !== era.id) continue;

        const artist = getOrCreateArtist(item, artistsByName);
        const artwork = buildArtwork(item, artist);
        artworks.push(artwork);

        for (const cat of categoriesForArtwork(item, era)) {
          const key = `${cat.type}:${cat.name}`;
          if (!categoriesByKey.has(key)) {
            categoriesByKey.set(key, { id: randomUUID(), type: cat.type, name: cat.name });
          }
          artworkCategories.push({ artwork_id: artwork.id, category_id: categoriesByKey.get(key).id });
        }

        keptForSource++;
        keptForEra++;
        sourceTotals[source.id]++;
      }
      console.log(`  [${source.name}] kept ${keptForSource}`);
    }
    console.log(`  total: ${keptForEra}`);
  }

  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "artworks.json"), JSON.stringify(artworks, null, 2));
  await writeFile(path.join(out, "artists.json"), JSON.stringify(Array.from(artistsByName.values()), null, 2));
  await writeFile(path.join(out, "categories.json"), JSON.stringify(Array.from(categoriesByKey.values()), null, 2));
  await writeFile(path.join(out, "artwork_categories.json"), JSON.stringify(artworkCategories, null, 2));

  console.log(`\nDone. ${artworks.length} artworks written to ${out}`);
  console.log("Per-source totals:", sourceTotals);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
