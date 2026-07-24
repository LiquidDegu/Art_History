import { randomUUID } from "node:crypto";
import { LICENSE, LOCATION_NAME } from "./config.js";
import { parseYear, detectStyle, detectTheme, detectMedium, isLikelyStillInCopyright } from "./classify.js";

// Section 7: only Met objects the API itself marks public domain are eligible,
// and even then a recently-deceased artist is excluded defensively.
export function isEligible(raw) {
  return Boolean(
    raw &&
      raw.isPublicDomain === true &&
      raw.primaryImage &&
      raw.objectID !== undefined &&
      !isLikelyStillInCopyright(raw.artistEndDate)
  );
}

export function getOrCreateArtist(raw, artistsByName) {
  const name = (raw.artistDisplayName || "").trim() || "Unknown";
  if (artistsByName.has(name)) return artistsByName.get(name);
  const artist = {
    id: randomUUID(),
    name,
    birth_year: parseYear(raw.artistBeginDate),
    death_year: parseYear(raw.artistEndDate),
    nationality: raw.artistNationality || null,
  };
  artistsByName.set(name, artist);
  return artist;
}

export function buildArtwork(raw, artist) {
  return {
    id: randomUUID(),
    title: raw.title || "Untitled",
    artist_id: artist.id,
    year: parseYear(raw.objectBeginDate),
    image_url: raw.primaryImage,
    source_api_id: String(raw.objectID),
    medium: detectMedium(raw.medium || raw.classification),
    license_type: LICENSE.license_type,
    license_url: LICENSE.license_url,
    rights_source: LICENSE.rights_source,
  };
}

export function categoriesForArtwork(raw, era) {
  const categories = [
    { type: "epoch", name: era.name },
    { type: "location", name: LOCATION_NAME },
  ];
  const style = detectStyle(raw.period);
  if (style) categories.push({ type: "style", name: style });
  const theme = detectTheme({ title: raw.title, tags: raw.tags });
  if (theme) categories.push({ type: "theme", name: theme });
  return categories;
}
