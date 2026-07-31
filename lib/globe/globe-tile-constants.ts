/** Globe.gl tile engine caps — street zoom lives in Workspace MapLibre. */

/**
 * CARTO light/voyager support high z, but globe.gl at z≥12 floods `/api/globe/tile`
 * and trips 429 (Vercel + upstream). Keep the home globe overview-only.
 */
export const GLOBE_TILE_ENGINE_MAX_LEVEL = 11;

/** Absolute clamp for the tile proxy API (fallback / legacy grids). */
export const GLOBE_TILE_MAX_ZOOM = 14;
