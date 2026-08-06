# Rimvio Agent Runtime Alignment Roadmap

**Status:** in progress 2026-08 (STEP 1–12 largely wired; UI strip polish remains)  
**Canonical Runtime:** `docs/RIMVIO_AGENT_RUNTIME.md` · ADR-050  
**Spine (internal):** ADR-045 · `enterRimvioAgentRuntime`  
**Wire:** `lib/context-run/agent-product-pipeline.ts` · `object-discovery.ts` · `agent-runtime-projection.ts` · `agent-status-work-log.ts`

> 목표: 기능 추가가 아니라 **모든 NL이 동일한 Agent Runtime을 통과**하도록 정렬한다.

## Product pipeline (only path)

```text
NL → Intent → Context → Planner → Discovery → Enrichment
  → Evaluation → Workspace Patch → Projection → Status
  → Prepare → Commit
```

예외 Runtime 금지. workstream Observer/Verifier는 **검증 층**이지 두 번째 제품 Runtime이 아니다.

## Steps

| STEP | Focus | Status |
|------|--------|--------|
| 1 | Single ingress | ✅ `beginAgentProductTurn` |
| 2 | Planner → Discovery | ✅ `planObjectDiscovery` first |
| 3 | Discovery Layer | ✅ lodging via `runObjectDiscovery` |
| 4 | Enrichment | ✅ `enrichDiscoveredObjects` |
| 5 | Evaluation | ✅ `evaluateCandidateObjects` |
| 6 | Patch SSOT | ✅ Workspace remains SSOT |
| 7 | Projection | ✅ `writeAgentRuntimeProjectionFromWorkspace` |
| 8 | Agent Status | ✅ `resolveAgentStatusWorkLog` |
| 9 | Prepare only | ✅ stage stamp · prepare-layer |
| 10 | Commit Gate | ✅ commit stage · Article 0 wait |
| 11 | Verify / Repair | ✅ `verifyAgentProductStage` |
| 12 | Domain align | ✅ lodging + spatial/eatery enrich·eval |

## Remaining polish

- ~~Agent Status **UI strip**~~ → folded into AgentChatCard  
- ~~Cursor-like Activity~~ → **In-card** light inset terminal + auto-collapse  
- ~~Finish density~~ → `buildAgentFinishMessageKo` (what / why / next)  
- Map/Callout Projection-only (incremental)

## Completion criterion

New feature = extend **Planner + Discovery** only.  
Map · Callout · Compare · Status stay projection consumers.
