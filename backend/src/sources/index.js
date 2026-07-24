import { metSource } from "./metSource.js";
import { clevelandSource } from "./clevelandSource.js";
import { articSource } from "./articSource.js";

// Section 9 Step 1 names six CC0 sources: Met, Smithsonian, Cleveland, Art
// Institute of Chicago, NGA, Getty. Only the three below are wired up so far;
// see backend/README.md for why Smithsonian/NGA/Getty aren't yet — each
// needs a materially different integration (API key + inconsistent schema,
// bulk CSV distribution instead of a query API, and no stable public REST
// API, respectively) rather than being a drop-in fourth adapter.
export const SOURCES = {
  met: metSource,
  cleveland: clevelandSource,
  artic: articSource,
};

export const ALL_SOURCE_IDS = Object.keys(SOURCES);
