import type { Artwork, Category, CategoryType, EraId, Question } from '../types/content';
import {
  ARTISTS,
  ARTWORK_CATEGORIES,
  ARTWORKS,
  CATEGORIES,
  ERAS,
  QUESTIONS,
  artistName,
} from './data';

export { ERAS, ARTISTS, CATEGORIES, ARTWORKS, QUESTIONS, artistName };

const categoryById = new Map<string, Category>(CATEGORIES.map((c) => [c.id, c]));
const artworkCategoryIdsByArtwork = new Map<string, string[]>();
for (const { artworkId, categoryId } of ARTWORK_CATEGORIES) {
  const list = artworkCategoryIdsByArtwork.get(artworkId) ?? [];
  list.push(categoryId);
  artworkCategoryIdsByArtwork.set(artworkId, list);
}

function epochCategoryIdForEra(eraId: EraId): string | undefined {
  return CATEGORIES.find((c) => c.type === 'epoch' && c.name === ERAS.find((e) => e.id === eraId)?.name)?.id;
}

export function getArtworksByEra(eraId: EraId): Artwork[] {
  const epochId = epochCategoryIdForEra(eraId);
  if (!epochId) return [];
  return ARTWORKS.filter((a) => a.categoryIds.includes(epochId));
}

export function getQuestionsByEra(eraId: EraId): Question[] {
  const artworkIds = new Set(getArtworksByEra(eraId).map((a) => a.id));
  return QUESTIONS.filter((q) => artworkIds.has(q.artworkId));
}

export function getCategoriesByType(type: CategoryType): Category[] {
  return CATEGORIES.filter((c) => c.type === type).sort((a, b) => a.name.localeCompare(b.name));
}

export function getArtworksByCategory(categoryId: string): Artwork[] {
  return ARTWORKS.filter((a) => a.categoryIds.includes(categoryId));
}

export function getCategory(categoryId: string): Category | undefined {
  return categoryById.get(categoryId);
}

export function getArtwork(artworkId: string): Artwork | undefined {
  return ARTWORKS.find((a) => a.id === artworkId);
}

export function getArtistName(artistId: string): string {
  return ARTISTS.find((a) => a.id === artistId)?.name ?? 'Unknown';
}

export function getCategoriesForArtwork(artworkId: string, type?: CategoryType): Category[] {
  const ids = artworkCategoryIdsByArtwork.get(artworkId) ?? [];
  const cats = ids.map((id) => categoryById.get(id)).filter((c): c is Category => !!c);
  return type ? cats.filter((c) => c.type === type) : cats;
}

export function getEraForArtwork(artwork: Artwork): EraId {
  const epochCat = artwork.categoryIds
    .map((id) => categoryById.get(id))
    .find((c): c is Category => !!c && c.type === 'epoch');
  const era = ERAS.find((e) => e.name === epochCat?.name);
  return era?.id ?? ERAS[0].id;
}
