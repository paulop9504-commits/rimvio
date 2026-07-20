# ADR-021: Cursor OS Spine SSOT (four locked axes)

**Status:** accepted 2026-07  
**Wire:** `lib/context-run/cursor-os-spine.ts`  
**Related:** ADR-013 Isomorphism · ADR-011 Graph Command · ADR-012 Rule Engine

## Thesis

“알아서 돈다”는 만능 Tool이 아니다. Cursor Agent loop를 Rimvio에 올린 **네 축**이 SSOT다.

```
Intent → ToolId 라우터
  → Tool 결과 → Graph / Diff (채팅 dump 금지)
  → stage 순서 (tool_router → graph_command_ir → graph_engine)
  → 위험만 Field Commit / 조건은 soft chip
```

**Code SSOT:** `lib/context-run/cursor-os-spine.ts` (`CURSOR_OS_SPINE_AXES`)

## Law

> Intent routes Tools; Tools stamp Graph Diff; stages stay ordered; only dangerous Actions Field-Commit.

| Axis | Must | Never |
|------|------|-------|
| Intent → ToolId | `resolve-tool-id` · Search → `hotel.lookup` / … · Revise → `null` | Hardcode tool ids in planner UI |
| Tool → Diff | `stampSearchToolResultsToDiff` · RO stamp · brain markers | Assistant text as inventory SSOT |
| Stage order | Search path: `tool_router` before `graph_command_ir` | Invert or skip Context Builder |
| Approval | Field = Reserve/Purchase + `reservedOpIds` · soft chip = Filter/Pin/Delete/Revise | Delete/Share-prep opening Field |

## Prepare vs Commit

- `booking.prepare` = **예약 준비 (Commit 전)** — Inbox / Field queue만.
- Reality mutation = human Field Commit only (Article 0).

## Planner Diff bundle

Compound plans (`비교해서 … 예약`) collect soft Graph IR and flush **once**:

- working_set: `pin`×N + `compare` → one `applyGraphCommands` + one Tool Search `lastBatch` (`diffBundleId`)
- field_gate: `reserve_prep` + `wait_commit` → one Field open

Wire: `lib/action-planner/run-action-plan.ts` · types `diffPhase` / `diffBundleId`.

## Open project pack

Every turn pack must carry lodging Diff (`checkIn`/`Out` · guests · `lastBatchPlaceIds` · selected pin) via `lib/context-builder/resolve-lodging-diff-for-pack.ts`.

**Consume Diff in Tools:** `resolveLodgingStayForTools` / `mergeLodgingStayForToolInvoke` → `hotel.lookup` LiteAPI · `booking.prepare` · `reserve_prep` partySize. Pack without Tool consume is incomplete.

## Commit execution (separate track)

LiteAPI Reality Commit · payment/identity vault stay **outside** this spine.
Spine stops at `booking.prepare` + Field queue. Do not fold vault into Tool Router.

## Reject in review

- Parallel “result stores” that bypass session graph / lastBatch  
- Chat-only Search results without Diff stamp  
- Pack lodgingDiff that Tools never read (hardcoded guests/dates)  
- `tool_router` after `graph_engine` on Search turns  
- Condition edits auto-opening Field Commit  
- New Tool without Intent → ToolId route

## Relationship

ADR-013 = isomorphism thesis.  
ADR-021 = **runtime spine lock** (wires + PR gates).  
ADR-012 R7 = Commit vs soft-confirm taxonomy (aligned).
