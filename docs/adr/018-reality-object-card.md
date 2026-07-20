# ADR-018: Reality Object Card

**Status:** accepted 2026-07  
**Wire:** `lib/reality-object/build-object-card-model.ts` · `components/globe/globe-reality-object-card.tsx` · Context Bloom `execution_ready`

## Context

ADR-014 deferred a full Object Card. After Context Bloom, users need more than a CTA strip — they need to read the object (facts · photos · nearby · prep actions) without opening a mind-map or ontology UI.

## Decision

1. **Object Card tabs (L1):** 알아두기 · 사진 · 근처 · 할 일 (`information` · `gallery` · `nearby` · `execution`).
2. **Model** `buildObjectCardModel` from `RealityObjectV1` when present; otherwise bloom/map candidate fallback (title · type · capabilities).
3. **Nearby** comes from Context Bloom ranked related hits; ranks persist on `RealityObject.relations.edges` (ADR-019) and seed reselect.
4. **Timing** — card appears when bloom reaches `execution_ready`; Execution tab is default; other tabs readable immediately.
5. **Execution** reuses capability-gated prep CTAs (길찾기 · 예약 준비 · 결재함). Never auto-Commit.

## Consequences

- Bloom execution strip is superseded on Globe hub by Object Card (strip module may remain for tests / demos).
- Place Action Graph stays the explore-graph surface; Object Card is the Reality Object sheet after select→bloom.

## Reject in review

- Ontology / Entity / Relation labels in user-facing tab copy
- Auto-Commit from Object Card CTAs
- Showing Execution tab actions before bloom `execution_ready`
