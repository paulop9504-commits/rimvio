# ADR-015: Visual Projection Engine

**Status:** accepted 2026-07  
**Wire:** `lib/visual-projection/` · lodging/eatery marker factories · `globals.css` Reality Object styles

## Context

Cover images for Reality Objects were first-image / inventory defaults. Product law: the Globe shows the **most representative visual** for each object type (ramen → food, hotel → room, castle → full landmark), not a flat pin and not mandatory background removal.

Rimvio’s Globe is a **context workspace**, not a map that always shows every saved pin.

## Decision

1. **Visual Projection Engine** scores candidates with Recognition · Aesthetic · Projection · Representativeness (0–5 stars → total 0–100). Highest total becomes `coverImageUrl`.
2. **Representativeness matrix** is type×subject (restaurant×food=5, hotel×room=5, landmark×landmark_full=5). Subject inferred from URL/caption cues (deterministic; segmentation optional later).
3. **LOD by `GlobeDetailLevel`:** `space|region` → glyph · `city` → glyph+label · `neighborhood|street|pin` → cover image.
4. **Object Halo** — soft color behind floating objects by family (food orange · lodging blue · landmark purple). Same type shares halo + aspect (food 1:1 · lodging 16:9 · landmark 4:3).
5. **Floating objects** — translateY + drop-shadow (`rimvio-globe-reality-object`), not Google-style 📍 pins.
6. **Hierarchical context projection** — Reality Objects for the active context are `foreground`; other inventory is `background` (dimmed / glyph-held). `context_only` policy keeps foreground objects when tagged.

## Consequences

- `buildRealityObject` cover pick goes through `selectProjectionVisualUrl`.
- Marker create paths pass `detailLevel` so zoom remount changes LOD.
- Transparent PNG segmentation remains optional and secondary to representativeness.
- Selective cutout presentation runs only when `decideSegmentation` says YES (see ADR-017).

## Reject in review

- Mandatory nukki/segmentation as the only cover path
- Flat generic pins when a Reality Object visual exists
- Showing all historical saves at full weight while a trip context is active
- Marketing copy that calls objects “bookmarks” or “favorites”
