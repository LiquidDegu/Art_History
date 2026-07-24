// Art Institute of Chicago — API.
// No API key required. Docs: https://api.artic.edu/docs/
//
// Confidence note: same caveat as clevelandSource.js — the `query[term][...]`
// bracket-encoded Elasticsearch filter syntax below matches ARTIC's published
// examples, but this hasn't been exercised against the live API in this
// sandbox (blocked network). Every record is still re-checked client-side
// against the era's date range, so a query-syntax miss degrades to "fewer
// results" rather than mis-tagged ones.
import { REQUEST_DELAY_MS } from "../config.js";
import { sleep, getJson } from "../httpUtils.js";

const API_BASE = "https://api.artic.edu/api/v1/artworks";
const FIELDS = [
  "id",
  "title",
  "artist_title",
  "date_start",
  "date_end",
  "medium_display",
  "classification_title",
  "style_title",
  "is_public_domain",
  "image_id",
].join(",");

const LICENSE = {
  license_type: "CC0",
  license_url: "https://www.artic.edu/open-access",
  rights_source: "Art Institute of Chicago — Open Access API",
};

const LOCATION_NAME = "Art Institute of Chicago";

function numOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function midpoint(start, end) {
  if (typeof start === "number" && typeof end === "number") return (start + end) / 2;
  if (typeof start === "number") return start;
  if (typeof end === "number") return end;
  return null;
}

export function toCanonical(raw) {
  const imageUrl = raw.image_id ? `https://www.artic.edu/iiif/2/${raw.image_id}/full/843,/0/default.jpg` : null;
  return {
    sourceId: "artic",
    externalId: raw.id,
    isPublicDomain: raw.is_public_domain === true,
    imageUrl,
    title: raw.title || null,
    artistName: raw.artist_title || null,
    // ARTIC bundles artist dates into the free-text artist_display field
    // rather than separate structured fields, so birth/death year aren't
    // parsed here; getOrCreateArtist just dedupes by name for this source.
    artistBirthYear: null,
    artistDeathYear: null,
    artistNationality: null,
    dateBegin: numOrNull(raw.date_start),
    dateEnd: numOrNull(raw.date_end),
    mediumText: raw.medium_display || raw.classification_title || "",
    styleText: raw.style_title || "",
    themeText: [raw.title, raw.classification_title].filter(Boolean).join(" "),
    license: LICENSE,
    locationName: LOCATION_NAME,
  };
}

// Public-domain works with images are fetched once (across a capped number of
// pages) and cached on ctx, then filtered per era client-side by date range —
// avoids needing exact range-query syntax and avoids re-fetching per era.
async function fetchPublicDomainPool() {
  const results = [];
  const pageSize = 100;
  const maxPages = 20; // ~2000 candidate records across the collection

  for (let page = 1; page <= maxPages; page++) {
    const url = `${API_BASE}/search?query[term][is_public_domain]=true&fields=${FIELDS}&page=${page}&limit=${pageSize}`;
    let data;
    try {
      data = await getJson(url);
    } catch (err) {
      console.warn(`  [artic] page ${page} failed: ${err.message}`);
      break;
    }
    const batch = (data.data || []).filter((item) => item.image_id);
    results.push(...batch);
    if (!batch.length || !data.pagination || page >= data.pagination.total_pages) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return results;
}

export const articSource = {
  id: "artic",
  name: "Art Institute of Chicago",
  toCanonical,
  async fetchRawCandidates(era, { ctx }) {
    if (!ctx.cache.has("artic:pool")) {
      ctx.cache.set("artic:pool", await fetchPublicDomainPool());
    }
    const pool = ctx.cache.get("artic:pool");
    return pool.filter((raw) => {
      const mid = midpoint(raw.date_start, raw.date_end);
      return mid !== null && mid >= era.dateBegin && mid <= era.dateEnd;
    });
  },
};
