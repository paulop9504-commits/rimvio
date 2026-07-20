# ADR-014: Reality Object Engine

**Status:** accepted 2026-07  
**Wire:** `lib/reality-object/` · Context Pin helpers · `GlobePlaceInfoCard`

## Context

「맥락에 고정」was writing `ContextPinnedItemV1` (and sometimes knowledge bookmarks). Product law: everything the user saves is a **Reality Object** in their Reality Graph — not a bookmark or favorite. World-geo `lib/reality-graph` (`geo:*`) is a different layer and must not store user objects.

## Decision

1. **RealityObjectV1** — Visual (cover) · Ontology · Location · Relations · Execution · Timeline · Metadata. Persisted on the context `EventCandidate` under `realityObjectsV1` + `realityObjectPrimaryId` via `commitEventUpsert`.
2. **Context Pin creates objects** — place / eatery / lodging pin helpers call `attachRealityObjectToPinMetadata` then still write `ContextPinnedItemV1` as a thin compat projection for existing readers.
3. **Globe projection** — markers prefer `coverImageUrl` (`resolveRealityObjectCoverForPlace`); no generic pin when cover exists.
4. **Execution** — capabilities gate Info CTAs; Inbox remains draft → human approve → Reality Commit. Never execute on pin.

## Consequences

- User-facing copy stays story-layer (맥락에 고정); never “bookmark / favorite”.
- `lib/reality-graph` stays world-geo only.
- Full Object Card tabs ship in ADR-018 (Info · Gallery · Nearby · Execution after Context Bloom).
- Nearby auto-graph persistence ships in ADR-019.
- Media (photo / reel / video) Reality Object ingress ships in ADR-020.
- Transparent PNG pixel rembg remains deferred (CSS selective cutout in ADR-017).

## Reject in review

- Parallel bookmark / favorites store for pinned places
- Treating world-geo Reality Graph as the user object store
- Auto Reality Commit from Context Pin or Info card tap
- Generic map pins when a Reality Object cover URL exists
