// Mirrors the Section 5 data model in docs/art-history-app-project-plan.md.
// This is the local, in-memory shape for the Step 2 app shell — no SQLite/
// PocketBase yet, so ids are plain strings rather than uuids and everything
// lives in src/content/data.ts instead of a synced database.

export type EraId =
  | 'ancient'
  | 'medieval'
  | 'renaissance'
  | 'baroque'
  | 'impressionism'
  | 'modern';

export type CategoryType = 'epoch' | 'style' | 'location' | 'theme';

export type Medium =
  | 'painting'
  | 'sculpture'
  | 'fresco'
  | 'manuscript'
  | 'mosaic'
  | 'tapestry'
  | 'other';

export type LicenseType = 'CC0' | 'PD' | 'CC-BY' | 'placeholder';

export type QuestionType = 'identify_artist' | 'identify_title' | 'identify_movement';

export interface Era {
  id: EraId;
  name: string;
  range: string;
}

export interface Artist {
  id: string;
  name: string;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string | null;
}

export interface Category {
  id: string;
  type: CategoryType;
  name: string;
}

export interface Artwork {
  id: string;
  title: string;
  artistId: string;
  year: number | null;
  medium: Medium;
  location: string;
  /** No live CC0 image pipeline has run yet (see backend/README.md) — the UI
   * renders a gradient placeholder card instead of a hotlinked image, so this
   * is deliberately unset rather than pointing at an unverified URL. */
  imageUrl: string | null;
  licenseType: LicenseType;
  licenseUrl: string | null;
  rightsSource: string;
  categoryIds: string[];
}

export interface ArtworkCategory {
  artworkId: string;
  categoryId: string;
}

export interface Question {
  id: string;
  artworkId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  type: QuestionType;
}
