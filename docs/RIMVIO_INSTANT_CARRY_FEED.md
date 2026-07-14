# Instant Carry Feed

**Status:** Locked (S0–S3 shipped on Globe Floor 1 memory dock)  
**Surface:** Globe home personal layer — **not** `/feed`, **not** scout discovery rail  
**Canonical stack:** [RIMVIO_THREE_FLOORS.md](./RIMVIO_THREE_FLOORS.md) · [RIMVIO_STORY_LAYER.md](./RIMVIO_STORY_LAYER.md) · [RIMVIO_ENTITY_RESOLVER.md](./RIMVIO_ENTITY_RESOLVER.md)

## One-liner

> Instagram scan density × Netflix continuity rows — users **carry** place · time · people · next step in few taps.

## Law

| Do | Don't |
|----|--------|
| Floor 1 personal replay (흔적 · 이어가기) | Replace Globe with recommendation list |
| One-line hooks on thumbs | Like / view / star metrics |
| Asymmetric Continuity hero | Symmetry-for-symmetry masonry |
| Entity Resolver →「근처」lanes | Discovery scout rail as Instant Carry |

## Composition

1. **Continuity hero** — resume session or richest trigger; progress = Continuity (not watch %)
2. **Lens chips** — 흔적 · 맥락 · 근처 · 할 일
3. **Row「그때 거기」** — horizontal posters (personal media)
4. **Row「같은 맥락」** — MEANING clusters (place / kind)
5. **Row「근처」** — Station / Airport / Landmark from Entity Resolver + matching traces
6. **Dense strip** — 2-col masonry, hook caption only

## 「근처」 (S3)

| Input | Output |
|-------|--------|
| Resume / trigger text | `resolveEntities` → near-capable spatial entities |
| Scout `triggerMessage` on last batch write | Anchor store (`instant-carry-entity-anchor-store`) |
| Matching personal traces | Poster carousel under `${label} 근처` |
| No personal match | Compose seed CTA (`도쿄역 근처`) — not discovery rail open |

Near-capable: Station · Airport · Location · Museum · Landmark path · `nearSearch`.

## Mount

`GlobeHomeMemoryRecallPanel` → `GlobeInstantCarryFeed`  
Opened via memory toggle / compose focus (existing dock gates).

## Code

| Area | Path |
|------|------|
| Model | `lib/globe/instant-carry/` |
| UI | `components/globe/globe-instant-carry-feed.tsx` |
| Copy | `copy.globe.instantCarry*` |
| Scout wire | `writeContextConditionLastBatch` → `recordInstantCarryAnchorsFromUtterance` |

## Sprint

| Stage | Scope | Status |
|-------|--------|--------|
| **S0** | Continuity hero +「그때 거기」row | shipped |
| **S1** |「같은 맥락」MEANING rows | shipped |
| **S2** | Dense masonry strip | shipped |
| **S3** | Entity Resolver →「근처」lanes | shipped |
