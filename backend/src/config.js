// Tunable defaults for the Met Museum content pipeline.
// Per project-plan.md Section 6, game-balance numbers live in a config module;
// the same principle applies here to pipeline knobs (sample size, rate limiting).

export const MET_API_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// Era ids/names/ranges mirror ERAS in docs/art-history-app-prototype.jsx so the
// content pipeline's "epoch" categories line up with the UI reference.
// departmentIds narrow the Met API search per era; Renaissance/Baroque/
// Impressionism share European Paintings & Sculpture departments and are
// split apart by object date range instead (see classify.js#eraForDateRange).
export const ERAS = [
  { id: "ancient", name: "Antiquity", dateBegin: -3000, dateEnd: 400, departmentIds: [3, 10, 13] },
  { id: "medieval", name: "Medieval", dateBegin: 500, dateEnd: 1400, departmentIds: [7, 17] },
  { id: "renaissance", name: "Renaissance", dateBegin: 1400, dateEnd: 1600, departmentIds: [11, 12] },
  { id: "baroque", name: "Baroque", dateBegin: 1600, dateEnd: 1750, departmentIds: [11, 12] },
  { id: "impressionism", name: "Impressionism", dateBegin: 1860, dateEnd: 1900, departmentIds: [11] },
  { id: "modern", name: "Modern", dateBegin: 1900, dateEnd: new Date().getFullYear(), departmentIds: [21] },
];

export const CATEGORY_TYPES = ["epoch", "style", "location", "theme"];

// Best-effort style detection against Met's free-text `period` field.
// Only tags a style when one of these known values (Section 5's example list) appears.
export const STYLE_KEYWORDS = [
  "High Renaissance",
  "Early Renaissance",
  "Northern Renaissance",
  "Rococo",
  "Baroque",
  "Cubism",
  "Fauvism",
  "Surrealism",
  "Impressionism",
  "Post-Impressionism",
  "Realism",
  "Romanticism",
  "Neoclassicism",
  "Byzantine",
  "Gothic",
  "Romanesque",
];

// Best-effort theme detection against title + Met's `tags[].term` list.
export const THEME_KEYWORDS = {
  Portrait: ["portrait"],
  Landscape: ["landscape"],
  Religious: ["madonna", "christ", "saint", "crucifixion", "virgin", "annunciation", "altarpiece", "biblical"],
  Mythological: ["venus", "apollo", "zeus", "athena", "myth", "hercules", "diana", "cupid"],
  "Still Life": ["still life"],
};

// Falls back to "other" when nothing matches — Section 5 lists this as an open enum ("etc.").
export const MEDIUM_MAP = [
  { match: /fresco/i, value: "fresco" },
  { match: /bronze|marble|stone|terracotta|sculpture|statue/i, value: "sculpture" },
  { match: /manuscript|vellum|parchment|illumination/i, value: "manuscript" },
  { match: /photograph/i, value: "photograph" },
  { match: /oil|tempera|canvas|panel|paint|gouache|watercolor/i, value: "painting" },
];

export const LICENSE = {
  license_type: "CC0",
  license_url: "https://www.metmuseum.org/policies/open-access",
  rights_source: "Metropolitan Museum of Art — Open Access API",
};

export const LOCATION_NAME = "Metropolitan Museum of Art";

// Section 7: exclude works by artists who died too recently to be safely public
// domain, even if the source API flags the record isPublicDomain. Defense in
// depth on top of Met's own flag, not a replacement for it.
export const COPYRIGHT_SAFE_YEARS = 70;

export const MAX_OBJECTS_PER_ERA = 60;
export const REQUEST_CONCURRENCY = 5;
export const REQUEST_DELAY_MS = 150;
