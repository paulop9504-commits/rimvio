# ADR-020: Media Reality Object Ingress

**Status:** accepted 2026-07  
**Wire:** `lib/reality-object/attach-media-reality-object.ts` · `commitCaptureToEvent` · media guide refresh

## Context

Photo / Reel / Video lived in feed captures and Media Guide stores without joining the same Reality Object graph as hotels and eateries. Product law: everything the user saves into a context is a **Reality Object**.

## Decision

1. **Media types** — `photo` · `video` · `reel` (shorts / Instagram reel URLs map to `reel`).
2. **Capture ingress** — `commitCaptureToEvent` upserts a Reality Object for photo/video fragments (`resourceId = {eventId}:media:{mediaId}`).
3. **Guide ingress** — after YouTube/public media guides refresh, `syncMediaGuideRealityObjects` writes video/reel objects onto the experience event.
4. **Capabilities** — media objects keep prep-only caps (`add_to_inbox` · `add_to_trip`); never auto-Commit.
5. **Not bookmarks** — same `realityObjectsV1` metadata as place pins; no parallel media favorites store.

## Consequences

- Object Card / Bloom can later treat media objects like places (nearby, gallery).
- Pool staging without a context still does **not** create a Reality Object (no event yet).

## Reject in review

- Separate “media bookmark” store
- Auto Reality Commit when a photo attaches
- Treating world-geo Reality Graph as the media object store
