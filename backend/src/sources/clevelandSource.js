// Cleveland Museum of Art — Open Access API.
// No API key required. Docs: https://openaccess-api.clevelandart.org/
//
// Confidence note: query param names below (cc0, has_image, created_after/
// before) match CMA's published API docs at the time this was written, but
// this pipeline hasn't been run against the live API (see backend/README.md)
// — double-check them against current docs before relying on this in
// production. Every record is still re-checked client-side against the era's
// date range regardless, so a param behaving differently would degrade
// (fewer/no matches) rather than silently mis-tag artworks.
import { REQUEST_DELAY_MS } from "../config.js";
import { sleep, getJson } from "../httpUtils.js";

const API_BASE = "https://openaccess-api.clevelandart.org/api/artworks/";

const LICENSE = {
  license_type: "CC0",
  license_url: "https://www.clevelandart.org/open-access",
  rights_source: "Cleveland Museum of Art — Open Access API",
};

const LOCATION_NAME = "Cleveland Museum of Art";

function parseIntOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function primaryCreator(record) {
  const creators = record.creators || [];
  return creators.find((c) => c.role === "artist") || creators[0] || null;
}

export function toCanonical(raw) {
  const creator = primaryCreator(raw);
  // creator.description looks like "Pablo Picasso (Spanish, 1881-1973)"; the
  // structured birth_year/death_year fields are used directly instead of
  // parsing that string, but the name still needs splitting off the suffix.
  const artistName = creator?.description ? creator.description.split(" (")[0].trim() : null;

  return {
    sourceId: "cleveland",
    externalId: raw.id,
    isPublicDomain: raw.share_license_status === "CC0",
    imageUrl: raw.images?.web?.url || null,
    title: raw.title || null,
    artistName,
    artistBirthYear: parseIntOrNull(creator?.birth_year),
    artistDeathYear: parseIntOrNull(creator?.death_year),
    artistNationality: null,
    dateBegin: parseIntOrNull(raw.creation_date_earliest),
    dateEnd: parseIntOrNull(raw.creation_date_latest),
    mediumText: raw.technique || raw.type || "",
    styleText: raw.type || "",
    themeText: [raw.title, raw.tombstone].filter(Boolean).join(" "),
    license: LICENSE,
    locationName: LOCATION_NAME,
  };
}

export const clevelandSource = {
  id: "cleveland",
  name: "Cleveland Museum of Art",
  toCanonical,
  async fetchRawCandidates(era, { limit }) {
    const results = [];
    const pageSize = 100;
    const maxPages = 10; // hard ceiling so a sparse era doesn't loop forever
    let skip = 0;

    for (let page = 0; page < maxPages && results.length < limit * 3; page++) {
      const url = new URL(API_BASE);
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("skip", String(skip));
      url.searchParams.set("cc0", "1");
      url.searchParams.set("has_image", "1");
      // CMA's date params appear to assume CE years; for the (BCE-spanning)
      // Antiquity era, skip them and rely on the client-side era re-check
      // below against creation_date_earliest/latest instead.
      if (era.dateBegin >= 0) {
        url.searchParams.set("created_after", String(era.dateBegin));
        url.searchParams.set("created_before", String(era.dateEnd));
      }

      let data;
      try {
        data = await getJson(url.toString());
      } catch (err) {
        console.warn(`  [cleveland] page ${page} failed: ${err.message}`);
        break;
      }
      const batch = data.data || [];
      results.push(...batch);
      if (batch.length < pageSize) break; // exhausted
      skip += pageSize;
      await sleep(REQUEST_DELAY_MS);
    }
    return results;
  },
};
