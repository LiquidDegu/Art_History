// Hand-curated seed content for the Step 2 app shell (local data only, no
// backend yet — see README.md "Build Roadmap Step 2").
//
// Why hand-curated instead of the backend/ pipeline's output: that pipeline
// (Build Roadmap Step 1) pulls from Met/Cleveland/ARTIC, but this sandbox's
// network policy blocks those APIs (see backend/README.md "Network note"),
// so there is no generated data/seed/*.json to import yet. Rather than block
// the whole app shell on that, this file hand-authors a real, accurate
// artwork set across all six eras so every screen can be built and tested
// against genuine art-history content.
//
// Image rights (project-plan.md Section 7): every artwork below is a famous,
// long-documented public-domain work, but no individual source image has
// been license-verified here, so `imageUrl` is deliberately left null and
// the UI renders a gradient placeholder card instead — same visual approach
// the reference prototype (docs/art-history-app-prototype.jsx) already
// uses. Swap in real `imageUrl`/`licenseType`/`licenseUrl` once either the
// Step 1 pipeline runs against live APIs, or (for these specific flagship
// works) Section 7's manual per-image verification track is done.
//
// Copyright eligibility (Section 7): same defensive rule as
// backend/src/config.js `COPYRIGHT_SAFE_YEARS` — exclude any artist who died
// less than ~70 years ago. Enforced below at module-load time, not just by
// author care, so a future edit can't silently reintroduce a too-recent work.

import type {
  Artist,
  Artwork,
  ArtworkCategory,
  Category,
  CategoryType,
  Era,
  Question,
} from '../types/content';

export const COPYRIGHT_SAFE_YEARS = 70;

export const ERAS: Era[] = [
  { id: 'ancient', name: 'Antiquity', range: '3000 BCE – 400 CE' },
  { id: 'medieval', name: 'Medieval', range: '500 – 1400' },
  { id: 'renaissance', name: 'Renaissance', range: '1400 – 1600' },
  { id: 'baroque', name: 'Baroque', range: '1600 – 1750' },
  { id: 'impressionism', name: 'Impressionism', range: '1860 – 1900' },
  { id: 'modern', name: 'Modern', range: '1900 – present' },
];

const ARTISTS: Artist[] = [];
const artistIndex = new Map<string, string>();

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function artist(
  name: string,
  birthYear: number | null,
  deathYear: number | null,
  nationality: string | null
): string {
  const id = slug(name);
  if (!artistIndex.has(id)) {
    if (deathYear !== null && new Date().getFullYear() - deathYear < COPYRIGHT_SAFE_YEARS) {
      throw new Error(
        `${name} died fewer than ${COPYRIGHT_SAFE_YEARS} years ago — excluded per plan Section 7`
      );
    }
    artistIndex.set(id, id);
    ARTISTS.push({ id, name, birthYear, deathYear, nationality });
  }
  return id;
}

const CATEGORIES: Category[] = [];
const categoryIndex = new Map<string, string>();

function cat(type: CategoryType, name: string): string {
  const key = `${type}:${name}`;
  let id = categoryIndex.get(key);
  if (!id) {
    id = slug(key);
    categoryIndex.set(key, id);
    CATEGORIES.push({ id, type, name });
  }
  return id;
}

// One epoch category per era, id-matched to ERAS so path/browse screens can
// share a single lookup.
const EPOCH_CATEGORY_ID: Record<string, string> = Object.fromEntries(
  ERAS.map((era) => [era.id, cat('epoch', era.name)])
);

const ARTWORKS: Artwork[] = [];

interface ArtworkSeed {
  title: string;
  artistName: string;
  artistBirth: number | null;
  artistDeath: number | null;
  artistNationality: string | null;
  era: Era['id'];
  year: number | null;
  medium: Artwork['medium'];
  location: string;
  style: string;
  theme?: string;
  rightsSource: string;
}

function addArtwork(seed: ArtworkSeed): void {
  const artistId = artist(seed.artistName, seed.artistBirth, seed.artistDeath, seed.artistNationality);
  const categoryIds = [
    EPOCH_CATEGORY_ID[seed.era],
    cat('style', seed.style),
    cat('location', seed.location),
  ];
  if (seed.theme) categoryIds.push(cat('theme', seed.theme));

  ARTWORKS.push({
    id: slug(`${seed.title}-${seed.era}`),
    title: seed.title,
    artistId,
    year: seed.year,
    medium: seed.medium,
    location: seed.location,
    imageUrl: null,
    licenseType: 'placeholder',
    licenseUrl: null,
    rightsSource: seed.rightsSource,
    categoryIds,
  });
}

// ---- Antiquity ----------------------------------------------------------
addArtwork({
  title: 'Venus de Milo', artistName: 'Unknown (Hellenistic Greek)', artistBirth: null, artistDeath: null,
  artistNationality: 'Greek', era: 'ancient', year: -130, medium: 'sculpture', location: 'Louvre',
  style: 'Hellenistic', theme: 'Mythological', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Winged Victory of Samothrace', artistName: 'Unknown (Hellenistic Greek)', artistBirth: null, artistDeath: null,
  artistNationality: 'Greek', era: 'ancient', year: -190, medium: 'sculpture', location: 'Louvre',
  style: 'Hellenistic', theme: 'Mythological', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Bust of Nefertiti', artistName: 'Thutmose', artistBirth: null, artistDeath: null,
  artistNationality: 'Egyptian', era: 'ancient', year: -1345, medium: 'sculpture', location: 'Neues Museum, Berlin',
  style: 'Egyptian', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Laocoön and His Sons', artistName: 'Agesander, Athenodoros, and Polydorus of Rhodes', artistBirth: null, artistDeath: null,
  artistNationality: 'Greek', era: 'ancient', year: -40, medium: 'sculpture', location: 'Vatican Museums',
  style: 'Hellenistic', theme: 'Mythological', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Discobolus (Discus Thrower)', artistName: 'Myron', artistBirth: null, artistDeath: null,
  artistNationality: 'Greek', era: 'ancient', year: -450, medium: 'sculpture', location: 'British Museum',
  style: 'Classical Greek', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Parthenon Frieze', artistName: "Workshop of Phidias", artistBirth: null, artistDeath: null,
  artistNationality: 'Greek', era: 'ancient', year: -440, medium: 'sculpture', location: 'British Museum',
  style: 'Classical Greek', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Augustus of Prima Porta', artistName: 'Unknown (Roman)', artistBirth: null, artistDeath: null,
  artistNationality: 'Roman', era: 'ancient', year: 15, medium: 'sculpture', location: 'Vatican Museums',
  style: 'Roman', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Villa of the Mysteries Frieze', artistName: 'Unknown (Roman)', artistBirth: null, artistDeath: null,
  artistNationality: 'Roman', era: 'ancient', year: -60, medium: 'fresco', location: 'Pompeii',
  style: 'Roman', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});

// ---- Medieval -------------------------------------------------------------
addArtwork({
  title: 'Book of Kells (Chi Rho page)', artistName: 'Unknown (Columban monks)', artistBirth: null, artistDeath: null,
  artistNationality: 'Insular', era: 'medieval', year: 800, medium: 'manuscript', location: 'Trinity College Dublin',
  style: 'Insular', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Utrecht Psalter', artistName: 'Unknown (Carolingian scribes)', artistBirth: null, artistDeath: null,
  artistNationality: 'Frankish', era: 'medieval', year: 820, medium: 'manuscript', location: 'Utrecht University Library',
  style: 'Carolingian', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Bayeux Tapestry', artistName: 'Unknown (Anglo-Norman embroiderers)', artistBirth: null, artistDeath: null,
  artistNationality: 'Anglo-Norman', era: 'medieval', year: 1070, medium: 'tapestry', location: 'Bayeux Museum',
  style: 'Romanesque', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Christ Pantocrator Mosaic', artistName: 'Unknown (Byzantine)', artistBirth: null, artistDeath: null,
  artistNationality: 'Byzantine', era: 'medieval', year: 1261, medium: 'mosaic', location: 'Hagia Sophia, Istanbul',
  style: 'Byzantine', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Wilton Diptych', artistName: 'Unknown (English or French master)', artistBirth: null, artistDeath: null,
  artistNationality: null, era: 'medieval', year: 1395, medium: 'painting', location: 'National Gallery, London',
  style: 'International Gothic', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Trinity', artistName: 'Andrei Rublev', artistBirth: 1360, artistDeath: 1430,
  artistNationality: 'Russian', era: 'medieval', year: 1411, medium: 'painting', location: 'Tretyakov Gallery, Moscow',
  style: 'Byzantine', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Lamentation of Christ', artistName: 'Giotto di Bondone', artistBirth: 1267, artistDeath: 1337,
  artistNationality: 'Italian', era: 'medieval', year: 1305, medium: 'fresco', location: 'Scrovegni Chapel, Padua',
  style: 'Proto-Renaissance', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Maestà', artistName: 'Duccio di Buoninsegna', artistBirth: 1255, artistDeath: 1319,
  artistNationality: 'Italian', era: 'medieval', year: 1308, medium: 'painting', location: 'Museo dell’Opera del Duomo, Siena',
  style: 'Sienese Gothic', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});

// ---- Renaissance ------------------------------------------------------
addArtwork({
  title: 'Mona Lisa', artistName: 'Leonardo da Vinci', artistBirth: 1452, artistDeath: 1519,
  artistNationality: 'Italian', era: 'renaissance', year: 1503, medium: 'painting', location: 'Louvre',
  style: 'High Renaissance', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Last Supper', artistName: 'Leonardo da Vinci', artistBirth: 1452, artistDeath: 1519,
  artistNationality: 'Italian', era: 'renaissance', year: 1498, medium: 'fresco', location: 'Santa Maria delle Grazie, Milan',
  style: 'High Renaissance', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Sistine Chapel Ceiling', artistName: 'Michelangelo Buonarroti', artistBirth: 1475, artistDeath: 1564,
  artistNationality: 'Italian', era: 'renaissance', year: 1512, medium: 'fresco', location: 'Vatican Museums',
  style: 'High Renaissance', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'David', artistName: 'Michelangelo Buonarroti', artistBirth: 1475, artistDeath: 1564,
  artistNationality: 'Italian', era: 'renaissance', year: 1504, medium: 'sculpture', location: 'Galleria dell’Accademia, Florence',
  style: 'High Renaissance', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The School of Athens', artistName: 'Raphael', artistBirth: 1483, artistDeath: 1520,
  artistNationality: 'Italian', era: 'renaissance', year: 1511, medium: 'fresco', location: 'Vatican Museums',
  style: 'High Renaissance', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Birth of Venus', artistName: 'Sandro Botticelli', artistBirth: 1445, artistDeath: 1510,
  artistNationality: 'Italian', era: 'renaissance', year: 1486, medium: 'painting', location: 'Uffizi Gallery, Florence',
  style: 'Early Renaissance', theme: 'Mythological', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Arnolfini Portrait', artistName: 'Jan van Eyck', artistBirth: 1390, artistDeath: 1441,
  artistNationality: 'Flemish', era: 'renaissance', year: 1434, medium: 'painting', location: 'National Gallery, London',
  style: 'Northern Renaissance', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Garden of Earthly Delights', artistName: 'Hieronymus Bosch', artistBirth: 1450, artistDeath: 1516,
  artistNationality: 'Dutch', era: 'renaissance', year: 1503, medium: 'painting', location: 'Museo del Prado, Madrid',
  style: 'Northern Renaissance', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});

// ---- Baroque ------------------------------------------------------------
addArtwork({
  title: 'Girl with a Pearl Earring', artistName: 'Johannes Vermeer', artistBirth: 1632, artistDeath: 1675,
  artistNationality: 'Dutch', era: 'baroque', year: 1665, medium: 'painting', location: 'Mauritshuis, The Hague',
  style: 'Dutch Golden Age', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Night Watch', artistName: 'Rembrandt van Rijn', artistBirth: 1606, artistDeath: 1669,
  artistNationality: 'Dutch', era: 'baroque', year: 1642, medium: 'painting', location: 'Rijksmuseum, Amsterdam',
  style: 'Dutch Golden Age', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Las Meninas', artistName: 'Diego Velázquez', artistBirth: 1599, artistDeath: 1660,
  artistNationality: 'Spanish', era: 'baroque', year: 1656, medium: 'painting', location: 'Museo del Prado, Madrid',
  style: 'Spanish Baroque', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Judith Slaying Holofernes', artistName: 'Artemisia Gentileschi', artistBirth: 1593, artistDeath: 1656,
  artistNationality: 'Italian', era: 'baroque', year: 1620, medium: 'painting', location: 'Uffizi Gallery, Florence',
  style: 'Baroque', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Calling of St Matthew', artistName: 'Caravaggio', artistBirth: 1571, artistDeath: 1610,
  artistNationality: 'Italian', era: 'baroque', year: 1600, medium: 'painting', location: 'San Luigi dei Francesi, Rome',
  style: 'Baroque', theme: 'Religious', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Anatomy Lesson of Dr. Nicolaes Tulp', artistName: 'Rembrandt van Rijn', artistBirth: 1606, artistDeath: 1669,
  artistNationality: 'Dutch', era: 'baroque', year: 1632, medium: 'painting', location: 'Mauritshuis, The Hague',
  style: 'Dutch Golden Age', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Self-Portrait with Two Circles', artistName: 'Rembrandt van Rijn', artistBirth: 1606, artistDeath: 1669,
  artistNationality: 'Dutch', era: 'baroque', year: 1665, medium: 'painting', location: 'Kenwood House, London',
  style: 'Dutch Golden Age', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Still Life with a Skull and a Writing Quill', artistName: 'Pieter Claesz', artistBirth: 1597, artistDeath: 1660,
  artistNationality: 'Dutch', era: 'baroque', year: 1628, medium: 'painting', location: 'Metropolitan Museum of Art',
  style: 'Dutch Golden Age', theme: 'Still Life', rightsSource: 'Public domain — antiquity',
});

// ---- Impressionism (incl. Post-Impressionism) ----------------------------
addArtwork({
  title: 'Impression, Sunrise', artistName: 'Claude Monet', artistBirth: 1840, artistDeath: 1926,
  artistNationality: 'French', era: 'impressionism', year: 1872, medium: 'painting', location: 'Musée Marmottan Monet, Paris',
  style: 'Impressionism', theme: 'Landscape', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Water Lilies', artistName: 'Claude Monet', artistBirth: 1840, artistDeath: 1926,
  artistNationality: 'French', era: 'impressionism', year: 1899, medium: 'painting', location: 'Musée de l’Orangerie, Paris',
  style: 'Impressionism', theme: 'Landscape', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Bal du moulin de la Galette', artistName: 'Pierre-Auguste Renoir', artistBirth: 1841, artistDeath: 1919,
  artistNationality: 'French', era: 'impressionism', year: 1876, medium: 'painting', location: 'Musée d’Orsay, Paris',
  style: 'Impressionism', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Dance Class', artistName: 'Edgar Degas', artistBirth: 1834, artistDeath: 1917,
  artistNationality: 'French', era: 'impressionism', year: 1874, medium: 'painting', location: 'Musée d’Orsay, Paris',
  style: 'Impressionism', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'A Sunday on La Grande Jatte', artistName: 'Georges Seurat', artistBirth: 1859, artistDeath: 1891,
  artistNationality: 'French', era: 'impressionism', year: 1886, medium: 'painting', location: 'Art Institute of Chicago',
  style: 'Post-Impressionism', theme: 'Landscape', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Starry Night', artistName: 'Vincent van Gogh', artistBirth: 1853, artistDeath: 1890,
  artistNationality: 'Dutch', era: 'impressionism', year: 1889, medium: 'painting', location: 'MoMA, New York',
  style: 'Post-Impressionism', theme: 'Landscape', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Card Players', artistName: 'Paul Cézanne', artistBirth: 1839, artistDeath: 1906,
  artistNationality: 'French', era: 'impressionism', year: 1895, medium: 'painting', location: 'Musée d’Orsay, Paris',
  style: 'Post-Impressionism', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Luncheon of the Boating Party', artistName: 'Pierre-Auguste Renoir', artistBirth: 1841, artistDeath: 1919,
  artistNationality: 'French', era: 'impressionism', year: 1881, medium: 'painting', location: 'The Phillips Collection, Washington DC',
  style: 'Impressionism', rightsSource: 'Public domain — antiquity',
});

// ---- Modern (all artists died 1956 or earlier — Section 7's 70-year rule) --
addArtwork({
  title: 'The Scream', artistName: 'Edvard Munch', artistBirth: 1863, artistDeath: 1944,
  artistNationality: 'Norwegian', era: 'modern', year: 1893, medium: 'painting', location: 'National Gallery, Oslo',
  style: 'Expressionism', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Kiss', artistName: 'Gustav Klimt', artistBirth: 1862, artistDeath: 1918,
  artistNationality: 'Austrian', era: 'modern', year: 1908, medium: 'painting', location: 'Belvedere, Vienna',
  style: 'Vienna Secession', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'American Gothic', artistName: 'Grant Wood', artistBirth: 1891, artistDeath: 1942,
  artistNationality: 'American', era: 'modern', year: 1930, medium: 'painting', location: 'Art Institute of Chicago',
  style: 'American Regionalism', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'The Dream', artistName: 'Henri Rousseau', artistBirth: 1844, artistDeath: 1910,
  artistNationality: 'French', era: 'modern', year: 1910, medium: 'painting', location: 'MoMA, New York',
  style: 'Naïve Art', theme: 'Landscape', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Composition VIII', artistName: 'Wassily Kandinsky', artistBirth: 1866, artistDeath: 1944,
  artistNationality: 'Russian', era: 'modern', year: 1923, medium: 'painting', location: 'Solomon R. Guggenheim Museum, New York',
  style: 'Abstract Art', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Composition with Red, Blue and Yellow', artistName: 'Piet Mondrian', artistBirth: 1872, artistDeath: 1944,
  artistNationality: 'Dutch', era: 'modern', year: 1930, medium: 'painting', location: 'Kunsthaus Zürich',
  style: 'De Stijl', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Portrait of Jeanne Hébuterne', artistName: 'Amedeo Modigliani', artistBirth: 1884, artistDeath: 1920,
  artistNationality: 'Italian', era: 'modern', year: 1919, medium: 'painting', location: 'Private collection',
  style: 'Expressionism', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});
addArtwork({
  title: 'Self-Portrait with Chinese Lantern Plant', artistName: 'Egon Schiele', artistBirth: 1890, artistDeath: 1918,
  artistNationality: 'Austrian', era: 'modern', year: 1912, medium: 'painting', location: 'Leopold Museum, Vienna',
  style: 'Expressionism', theme: 'Portrait', rightsSource: 'Public domain — antiquity',
});

const ARTWORK_CATEGORIES: ArtworkCategory[] = ARTWORKS.flatMap((art) =>
  art.categoryIds.map((categoryId) => ({ artworkId: art.id, categoryId }))
);

// ---- Questions ------------------------------------------------------------
// One per artwork for now — production should have more per room for replay
// value (Section 2), but this already exceeds the prototype's 2-per-era.
function byTitle(title: string): Artwork {
  const found = ARTWORKS.find((a) => a.title === title);
  if (!found) throw new Error(`No artwork titled "${title}" — check spelling in data.ts`);
  return found;
}

function artistName(a: Artwork): string {
  return ARTISTS.find((ar) => ar.id === a.artistId)!.name;
}

const QUESTIONS: Question[] = [];

function q(
  title: string,
  type: Question['type'],
  prompt: string,
  options: string[],
  correctIndex: number
): void {
  const artwork = byTitle(title);
  QUESTIONS.push({
    id: slug(`${artwork.id}-q${QUESTIONS.length}`),
    artworkId: artwork.id,
    prompt,
    options,
    correctIndex,
    type,
  });
}

q('Venus de Milo', 'identify_title',
  'This armless marble figure, carved around 130 BCE, is displayed in the Louvre.',
  ['Venus de Milo', 'Winged Victory of Samothrace', 'Laocoön and His Sons', 'Augustus of Prima Porta'], 0);
q('Winged Victory of Samothrace', 'identify_title',
  'This headless marble goddess, poised as if landing on a ship’s prow, dates to around 190 BCE.',
  ['Discobolus', 'Winged Victory of Samothrace', 'Bust of Nefertiti', 'Venus de Milo'], 1);
q('Bust of Nefertiti', 'identify_movement',
  'This painted limestone bust follows the strict conventions of which ancient civilization’s royal portraiture?',
  ['Sumerian', 'Minoan', 'Egyptian', 'Mycenaean'], 2);
q('Laocoön and His Sons', 'identify_title',
  'This Hellenistic sculpture shows a Trojan priest and his sons crushed by sea serpents.',
  ['Parthenon Frieze', 'Laocoön and His Sons', 'Discobolus', 'Augustus of Prima Porta'], 1);
q('Discobolus (Discus Thrower)', 'identify_artist',
  'This Classical Greek sculpture of an athlete mid-throw is attributed to which sculptor?',
  ['Phidias', 'Myron', 'Praxiteles', 'Polykleitos'], 1);
q('Parthenon Frieze', 'identify_movement',
  'This continuous sculpted band, depicting a religious procession, ran around the top of which Athenian temple?',
  ['The Erechtheion', 'The Parthenon', 'The Temple of Zeus', 'The Hephaisteion'], 1);
q('Augustus of Prima Porta', 'identify_movement',
  'This idealized statue of the first Roman emperor belongs to which artistic tradition?',
  ['Egyptian', 'Roman', 'Byzantine', 'Etruscan'], 1);
q('Villa of the Mysteries Frieze', 'identify_movement',
  'This large fresco cycle, depicting rites of the cult of Dionysus, survives in a villa buried by Vesuvius in which city?',
  ['Herculaneum', 'Ostia', 'Pompeii', 'Paestum'], 2);

q('Book of Kells (Chi Rho page)', 'identify_movement',
  'This lavishly illuminated Gospel manuscript, made around 800 CE, was produced in which artistic tradition?',
  ['Carolingian', 'Insular', 'Byzantine', 'Ottonian'], 1);
q('Utrecht Psalter', 'identify_movement',
  'This 9th-century illustrated psalter, known for its energetic pen-drawing style, was produced under which dynasty?',
  ['Carolingian', 'Merovingian', 'Ottonian', 'Visigothic'], 0);
q('Bayeux Tapestry', 'identify_title',
  'This 70-metre embroidered cloth narrates the Norman conquest of England in 1066.',
  ['The Book of Kells', 'The Bayeux Tapestry', 'The Utrecht Psalter', 'The Trinity'], 1);
q('Christ Pantocrator Mosaic', 'identify_movement',
  'This mosaic of Christ, in the former cathedral now mosque Hagia Sophia, exemplifies which artistic tradition?',
  ['Romanesque', 'Gothic', 'Byzantine', 'Carolingian'], 2);
q('Wilton Diptych', 'identify_movement',
  'This small portable altarpiece, made for an English king, is a prime example of which international court style?',
  ['International Gothic', 'Romanesque', 'Byzantine', 'Sienese Gothic'], 0);
q('The Trinity', 'identify_artist',
  'This icon depicting three angels at Abraham’s table is the most famous work of which Russian icon painter?',
  ['Theophanes the Greek', 'Andrei Rublev', 'Dionisius', 'Simon Ushakov'], 1);
q('Lamentation of Christ', 'identify_artist',
  'This fresco mourning the dead Christ, in Padua’s Scrovegni Chapel, is by which early Italian master?',
  ['Cimabue', 'Duccio di Buoninsegna', 'Giotto di Bondone', 'Simone Martini'], 2);
q('Maestà', 'identify_artist',
  'This large altarpiece of the enthroned Madonna, made for Siena Cathedral, is by which painter?',
  ['Giotto di Bondone', 'Duccio di Buoninsegna', 'Fra Angelico', 'Pietro Lorenzetti'], 1);

q('Mona Lisa', 'identify_artist',
  'This portrait’s subtle smoke-like shading technique is called sfumato.',
  ['Leonardo da Vinci', 'Raphael', 'Botticelli', 'Titian'], 0);
q('The Last Supper', 'identify_artist',
  'This mural of Christ’s final meal with his disciples was painted on a Milan refectory wall.',
  ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], 1);
q('Sistine Chapel Ceiling', 'identify_artist',
  'Painted directly onto the Sistine Chapel ceiling between 1508 and 1512.',
  ['Donatello', 'Michelangelo', 'Bramante', 'Ghiberti'], 1);
q('David', 'identify_artist',
  'This 17-foot marble sculpture of the biblical shepherd stands in Florence’s Accademia Gallery.',
  ['Donatello', 'Michelangelo', 'Bernini', 'Verrocchio'], 1);
q('The School of Athens', 'identify_artist',
  'This fresco gathers ancient philosophers like Plato and Aristotle in one grand hall.',
  ['Raphael', 'Michelangelo', 'Leonardo da Vinci', 'Titian'], 0);
q('The Birth of Venus', 'identify_artist',
  'This painting shows the goddess Venus arriving on a shell at the shore.',
  ['Titian', 'Sandro Botticelli', 'Piero della Francesca', 'Fra Filippo Lippi'], 1);
q('Arnolfini Portrait', 'identify_artist',
  'This oil painting of a merchant couple is famous for its convex mirror reflecting the room behind them.',
  ['Jan van Eyck', 'Rogier van der Weyden', 'Hans Memling', 'Robert Campin'], 0);
q('The Garden of Earthly Delights', 'identify_artist',
  'This surreal triptych of paradise, earthly pleasure, and hell is by which Netherlandish painter?',
  ['Pieter Bruegel the Elder', 'Hieronymus Bosch', 'Jan van Eyck', 'Albrecht Dürer'], 1);

q('Girl with a Pearl Earring', 'identify_artist',
  'This Dutch "tronie" of a girl in a blue-and-gold headscarf is sometimes called the "Mona Lisa of the North."',
  ['Rembrandt', 'Frans Hals', 'Johannes Vermeer', 'Jan van Eyck'], 2);
q('The Night Watch', 'identify_artist',
  'This monumental militia group portrait is famous for its dramatic use of light and shadow.',
  ['Frans Hals', 'Rembrandt van Rijn', 'Johannes Vermeer', 'Jan Steen'], 1);
q('Las Meninas', 'identify_artist',
  'This complex group portrait includes the artist himself painting at an easel, and the Spanish royal family reflected in a mirror.',
  ['Francisco Goya', 'Diego Velázquez', 'El Greco', 'Bartolomé Esteban Murillo'], 1);
q('Judith Slaying Holofernes', 'identify_artist',
  'This violent biblical scene is one of the signature works of which Baroque painter?',
  ['Caravaggio', 'Artemisia Gentileschi', 'Guido Reni', 'Orazio Gentileschi'], 1);
q('The Calling of St Matthew', 'identify_movement',
  'This painting’s dramatic single light source and dark background is the hallmark of which painter’s style?',
  ['Rembrandt’s chiaroscuro', 'Caravaggio’s tenebrism', 'Vermeer’s naturalism', 'Rubens’ dynamism'], 1);
q('The Anatomy Lesson of Dr. Nicolaes Tulp', 'identify_artist',
  'This group portrait shows a surgeon demonstrating dissection to a group of colleagues.',
  ['Rembrandt van Rijn', 'Jan Steen', 'Frans Hals', 'Gerard Dou'], 0);
q('Still Life with a Skull and a Writing Quill', 'identify_movement',
  'This Dutch vanitas still life, featuring a skull as a reminder of mortality, belongs to which genre?',
  ['Landscape', 'Still life', 'History painting', 'Portraiture'], 1);

q('Impression, Sunrise', 'identify_title',
  'This 1872 harbor scene gave the whole movement its name.',
  ['Water Lilies', 'Impression, Sunrise', 'Bal du moulin de la Galette', 'The Card Players'], 1);
q('Water Lilies', 'identify_artist',
  'This series of paintings depicts the artist’s own flower garden pond at Giverny.',
  ['Claude Monet', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Paul Cézanne'], 0);
q('Bal du moulin de la Galette', 'identify_artist',
  'This lively outdoor dance-hall scene, dappled with sunlight, is by which Impressionist painter?',
  ['Claude Monet', 'Edgar Degas', 'Pierre-Auguste Renoir', 'Georges Seurat'], 2);
q('The Dance Class', 'identify_artist',
  'This painting of ballerinas rehearsing under an instructor’s eye is by which Impressionist painter?',
  ['Edgar Degas', 'Claude Monet', 'Mary Cassatt', 'Édouard Manet'], 0);
q('A Sunday on La Grande Jatte', 'identify_movement',
  'This large park scene, built entirely from tiny dots of pure color, exemplifies which technique?',
  ['Impressionism', 'Pointillism', 'Fauvism', 'Cubism'], 1);
q('The Starry Night', 'identify_artist',
  'This swirling night sky over a quiet village was painted from the artist’s asylum window.',
  ['Paul Gauguin', 'Vincent van Gogh', 'Paul Cézanne', 'Henri de Toulouse-Lautrec'], 1);
q('The Card Players', 'identify_artist',
  'This series of paintings shows peasants absorbed in a game of cards, by a painter often called the father of modern art.',
  ['Paul Cézanne', 'Edgar Degas', 'Georges Seurat', 'Camille Pissarro'], 0);
q('Luncheon of the Boating Party', 'identify_artist',
  'This painting shows friends relaxing over a meal on a balcony overlooking the Seine.',
  ['Claude Monet', 'Pierre-Auguste Renoir', 'Gustave Caillebotte', 'Edgar Degas'], 1);

q('The Scream', 'identify_artist',
  'This anguished figure on a bridge under a swirling orange sky is by which Norwegian painter?',
  ['Edvard Munch', 'Wassily Kandinsky', 'Egon Schiele', 'Gustav Klimt'], 0);
q('The Kiss', 'identify_artist',
  'This gold-leaf painting of an embracing couple is the best-known work of which Vienna Secession painter?',
  ['Egon Schiele', 'Gustav Klimt', 'Oskar Kokoschka', 'Koloman Moser'], 1);
q('American Gothic', 'identify_title',
  'This painting of a farmer and his daughter standing before a white farmhouse became an icon of American art.',
  ['Nighthawks', 'American Gothic', 'Christina’s World', 'The Migrant Mother'], 1);
q('The Dream', 'identify_artist',
  'This jungle scene with a nude woman reclining on a couch is by a self-taught painter known for his naïve style.',
  ['Paul Gauguin', 'Henri Rousseau', 'Henri Matisse', 'Marc Chagall'], 1);
q('Composition VIII', 'identify_artist',
  'This geometric abstract painting, full of circles and lines, is by a pioneer of pure abstraction.',
  ['Wassily Kandinsky', 'Piet Mondrian', 'Kazimir Malevich', 'Paul Klee'], 0);
q('Composition with Red, Blue and Yellow', 'identify_movement',
  'This grid of black lines and primary-color blocks belongs to which Dutch abstract movement?',
  ['Cubism', 'De Stijl', 'Constructivism', 'Bauhaus'], 1);
q('Portrait of Jeanne Hébuterne', 'identify_artist',
  'This elongated, mask-like portrait of the artist’s partner is typical of which Italian modernist?',
  ['Amedeo Modigliani', 'Giorgio de Chirico', 'Umberto Boccioni', 'Gino Severini'], 0);
q('Self-Portrait with Chinese Lantern Plant', 'identify_artist',
  'This raw, angular self-portrait is by which Austrian Expressionist, a protégé of Gustav Klimt?',
  ['Oskar Kokoschka', 'Egon Schiele', 'Gustav Klimt', 'Richard Gerstl'], 1);

export { ARTISTS, CATEGORIES, ARTWORKS, ARTWORK_CATEGORIES, QUESTIONS, artistName };
