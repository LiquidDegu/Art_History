// Metropolitan Museum of Art — Open Access API.
// No API key required. Docs: https://metmuseum.github.io/
import { MAX_OBJECTS_PER_ERA_PER_SOURCE, REQUEST_CONCURRENCY, REQUEST_DELAY_MS } from "../config.js";
import { parseYear } from "../classify.js";
import { getJson, mapWithConcurrency, sleep } from "../httpUtils.js";

const API_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Renaissance/Baroque/Impressionism share European Paintings & Sculpture
// departments and are split apart by object date range instead, in the
// shared eraForDateRange check the runner applies after toCanonical().
const DEPARTMENT_IDS_BY_ERA = {
  ancient: [3, 10, 13], // Ancient Near Eastern, Egyptian, Greek and Roman
  medieval: [7, 17], // The Cloisters, Medieval Art
  renaissance: [11, 12], // European Paintings, European Sculpture and Decorative Arts
  baroque: [11, 12],
  impressionism: [11],
  modern: [21], // Modern Art
};

const LICENSE = {
  license_type: "CC0",
  license_url: "https://www.metmuseum.org/policies/open-access",
  rights_source: "Metropolitan Museum of Art — Open Access API",
};

const LOCATION_NAME = "Metropolitan Museum of Art";

async function listObjectIdsByDepartment(departmentId) {
  const data = await getJson(`${API_BASE}/objects?departmentIds=${departmentId}`);
  return data.objectIDs || [];
}

// Evenly-spaced sample so repeated runs are reproducible and don't just skim
// the lowest object IDs in each department.
function sample(ids, limit) {
  if (ids.length <= limit) return ids;
  const step = ids.length / limit;
  return Array.from({ length: limit }, (_, i) => ids[Math.floor(i * step)]);
}

export function toCanonical(raw) {
  return {
    sourceId: "met",
    externalId: raw.objectID,
    isPublicDomain: raw.isPublicDomain === true,
    imageUrl: raw.primaryImage || null,
    title: raw.title || null,
    artistName: raw.artistDisplayName || null,
    artistBirthYear: parseYear(raw.artistBeginDate),
    artistDeathYear: parseYear(raw.artistEndDate),
    artistNationality: raw.artistNationality || null,
    dateBegin: parseYear(raw.objectBeginDate),
    dateEnd: parseYear(raw.objectEndDate),
    mediumText: raw.medium || raw.classification || "",
    styleText: raw.period || "",
    themeText: [raw.title, ...(raw.tags || []).map((t) => t.term)].filter(Boolean).join(" "),
    license: LICENSE,
    locationName: LOCATION_NAME,
  };
}

export const metSource = {
  id: "met",
  name: "Metropolitan Museum of Art",
  toCanonical,
  async fetchRawCandidates(era, { limit = MAX_OBJECTS_PER_ERA_PER_SOURCE, ctx }) {
    const deptIds = DEPARTMENT_IDS_BY_ERA[era.id] || [];
    const ids = new Set();
    for (const deptId of deptIds) {
      const cacheKey = `met:dept:${deptId}`;
      if (!ctx.cache.has(cacheKey)) {
        ctx.cache.set(cacheKey, await listObjectIdsByDepartment(deptId));
      }
      for (const id of ctx.cache.get(cacheKey)) ids.add(id);
    }

    // Over-sample since date filtering + eligibility checks will reject many candidates.
    const candidateIds = sample(Array.from(ids), limit * 4);
    const results = [];
    for (let i = 0; i < candidateIds.length; i += REQUEST_CONCURRENCY) {
      const chunk = candidateIds.slice(i, i + REQUEST_CONCURRENCY);
      const objects = await mapWithConcurrency(chunk, REQUEST_CONCURRENCY, (id) =>
        getJson(`${API_BASE}/objects/${id}`).catch((err) => {
          console.warn(`  [met] skip ${id}: ${err.message}`);
          return null;
        })
      );
      await sleep(REQUEST_DELAY_MS);
      for (const raw of objects) if (raw) results.push(raw);
    }
    return results;
  },
};
