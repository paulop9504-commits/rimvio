# Bridge Planning Truth — Co-planning Sync

**Status:** Phase 5 shipped · 2026-07-06  
**Related:** `docs/RIMVIO_GLOBE_INGRESS.md` · `docs/RIMVIO_BRIDGE_VS_CONTAINER.md` · `docs/RFC_EXPERIENCE_BRIDGE.md`

## One line

**Committed planning truth on Bridge** — destination + path legs sync to friends; Runtime/Blueprint stay local.

## Metadata SSOT

```typescript
EventCandidate.metadata.bridgePlanningTruthV1 = {
  version: 1,
  revision,
  updatedByUserId,
  updatedAtIso,
  destination: { label, lat?, lng?, resolution },
  pathLabels: ["집", "공항", "오사카", "호텔"],
  pinnedLegIndex,
  flowStrokeStyle?,
}

EventCandidate.metadata.bridgePlanningHistoryV1 = BridgePlanningTruthV1[]

EventCandidate.metadata.bridgePlanningProposalQueueV1 = BridgePlanningProposalV1[]
EventCandidate.metadata.bridgePlanningProposalV1 = queue head (legacy mirror)
```

**Forbidden on Bridge:** `executionGraph`, Blueprint, Operator state.

## Commit path (host)

```
advanceDestination (local Runtime)
  → commitBridgePlanningTruth (host + bridge-linked)
  → POST action: planning_truth
  → event_snapshot update (clears proposal)
  → friends: syncBridgeSharedMediaFromRemote → mergeBridgePlanningTruthFromRemote
  → composeRealitySurfaceFromBridgeTruth (strip + arc)
```

## Proposal path (member → host)

```
member advanceDestination
  → proposeBridgePlanningTruth (local + POST planning_proposal)
  → bridge journey timeline: planning_proposal row
host 「함께 정하기」
  → acceptBridgePlanningProposal → commitBridgePlanningTruth
  → timeline: planning_commit row + history append
host 「넘기기」
  → rejectBridgePlanningProposal → pop FIFO head only
  → remaining queue stays for next review
member sync after host direct commit
  → toast: 「{destination} · 함께 여행 목적지가 정해졌어요」
multiple members propose
  → FIFO queue · timeline shows all · accept/reject on head only
```

## Ingress seed (host)

```
globe_ingress compile (trip frame, bridge-linked, no truth yet)
  → seedBridgePlanningTruthFromIngress (dashed path hypothesis)
```

## v1 rules

- **Host-only** Commit (API 403 for members)
- **Member** propose only — host must accept
- **Revision** merge — higher revision wins
- Participants pull via existing bridge media sync (`useBridgeMediaSync`)

## Code

| Module | Path |
|--------|------|
| Types + read | `lib/bridge-planning/` |
| Commit | `commit-bridge-planning-truth.ts` |
| Proposal | `propose-bridge-planning-truth.ts` · `accept-bridge-planning-proposal.ts` · `reject-bridge-planning-proposal.ts` |
| Timeline | `build-bridge-planning-timeline.ts` |
| API | `POST …/experience-bridge/[eventId]` `planning_truth` · `planning_proposal` |
| Sync merge | `sync-bridge-participant-media.ts` |
| UI | `experience-bridge-journey-timeline.tsx` · `globe-home-client.tsx` · `use-bridge-planning-sync-feedback.ts` |

Tests: `npx tsx scripts/test-bridge-planning-truth.ts`
