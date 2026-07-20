# ADR-017: Selective Segmentation Pipeline

**Status:** accepted 2026-07  
**Wire:** `lib/visual-projection/run-selective-segmentation.ts` · marker mount · `globals.css` cutout masks

## Context

Visual Projection Engine already scores representativeness and gates `useSegmentation` via `decideSegmentation`. Product law: nukki is never mandatory — nightscapes, beaches, markets, onsen keep the original frame.

## Decision

1. **Pipeline** `runSelectiveSegmentation` — gate first; YES → soft cutout presentation; NO → `keep_original`.
2. **MVP cutout** is CSS soft mask (`soft_blob` food · `soft_pill` room · `soft_ellipse` landmark), not pixel rembg. Same contract can later swap in a rembg adapter without changing marker wire.
3. **Cache** decisions by `objectType|url|recognitionScore` to avoid recompute on remount.
4. **Globe wire** — `resolveProjectedObjectVisual` returns `useSegmentation` + `cutoutMode`; lodging/eatery projectors pass them; `mountRealityObjectMarkerVisual` sets `data-object-cutout`.

## Consequences

- Food/room covers float with feathered edges when gate says YES.
- Scene images stay rectangular originals.
- Pixel-perfect background removal remains optional future work behind the same API.

## Reject in review

- Mandatory nukki for every cover
- Applying cutout when `decideSegmentation` returns NO
- Blocking Globe on remote rembg latency
