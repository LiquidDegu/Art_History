import { randomUUID } from "node:crypto";
import { detectStyle, detectTheme, detectMedium, isLikelyStillInCopyright } from "./classify.js";

// Operates on the canonical item shape every source adapter's toCanonical()
// produces (see src/sources/*.js), so this pipeline stays source-agnostic:
// {
//   sourceId, externalId, isPublicDomain, imageUrl, title,
//   artistName, artistBirthYear, artistDeathYear, artistNationality,
//   dateBegin, dateEnd, mediumText, styleText, themeText,
//   license: { license_type, license_url, rights_source }, locationName,
// }

// Section 7: only records a source itself marks public domain are eligible,
// and even then a recently-deceased artist is excluded defensively.
export function isEligible(item) {
  return Boolean(
    item &&
      item.isPublicDomain === true &&
      item.imageUrl &&
      item.externalId !== undefined &&
      item.externalId !== null &&
      !isLikelyStillInCopyright(item.artistDeathYear)
  );
}

// Dedupes by exact display-name match across all sources. Good enough at this
// scale; a stable authority id (ULAN/Wikidata) would be a better key if the
// same artist's name ever comes back formatted differently across museums.
export function getOrCreateArtist(item, artistsByName) {
  const name = (item.artistName || "").trim() || "Unknown";
  if (artistsByName.has(name)) return artistsByName.get(name);
  const artist = {
    id: randomUUID(),
    name,
    birth_year: item.artistBirthYear ?? null,
    death_year: item.artistDeathYear ?? null,
    nationality: item.artistNationality ?? null,
  };
  artistsByName.set(name, artist);
  return artist;
}

export function buildArtwork(item, artist) {
  return {
    id: randomUUID(),
    title: item.title || "Untitled",
    artist_id: artist.id,
    year: item.dateBegin ?? null,
    image_url: item.imageUrl,
    // prefixed with sourceId since raw ids can collide across museums
    source_api_id: `${item.sourceId}:${item.externalId}`,
    medium: detectMedium(item.mediumText),
    license_type: item.license.license_type,
    license_url: item.license.license_url,
    rights_source: item.license.rights_source,
  };
}

export function categoriesForArtwork(item, era) {
  const categories = [
    { type: "epoch", name: era.name },
    { type: "location", name: item.locationName },
  ];
  const style = detectStyle(item.styleText);
  if (style) categories.push({ type: "style", name: style });
  const theme = detectTheme(item.themeText);
  if (theme) categories.push({ type: "theme", name: theme });
  return categories;
}
