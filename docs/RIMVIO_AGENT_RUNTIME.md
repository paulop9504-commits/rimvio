# Rimvio Agent Runtime

**Status:** locked 2026-08  
**ADR:** `docs/adr/050-agent-runtime.md`  
**Constitution:** `docs/RIMVIO_AGENT_OPERATING_CONSTITUTION.md` (ADR-049)  
**Wire (primary):** `applyGlobeWorkspaceAgentTurn` · `tryApplyWorkspaceLodgingTurn` · Action Planner · Workspace Patch · Projection  
**External absorb:** ADR-051 · `docs/RIMVIO_REALITY_PROVIDER_RUNTIME.md` · `lib/reality-provider/`

> **AI의 목표는 답변을 만드는 것이 아니라 Reality Workspace를 지속적으로 업데이트하는 것이다.**  
> Chat = Intent 입구 · Workspace = SSOT · Projection = 화면

## Example

User: 「난바역 근처 캡슐호텔 찾아줘.」

---

## Pipeline (ordered)

### 1. Intent Understanding

```text
Natural Language → Intent (Goal)
```

Extract (do **not** search yet):

| Field | Example |
|-------|---------|
| Domain | Travel |
| Goal | Find Hotel |
| Category | Capsule Hotel |
| Anchor | Namba Station |
| Spatial | Nearby |

### 2. Context Resolution

```text
Current Context? → Osaka Trip
                 → No Context → Temporary Workspace
```

Workspace for this turn becomes SSOT (ADR-022 · ADR-025 · ADR-029).

### 3. Planner

Intent → **Task Graph** (what work), not “what to dump in chat”:

```text
Goal → Resolve Anchor → Search → Filter → Rank → Build Projection
```

Law 13: Plan Before Execute.

### 4. Object Discovery

Places / Booking / Hotels / Internal Graph → **Reality Objects**  
(Hotel A · B · C) under Planner constraints.

When Intent is **external-world absorb** (rail network · events · amenity sets),
run **ADR-051** first:

```text
Need Resolution → Reality Provider Resolution → Acquire → Normalize
```

then continue into Workspace Patch (stage 7). Do not invent a JR-only pipeline.

### 5. Object Enrichment

Rating · Price · Distance · Availability · Images · Booking · Reviews · Tags  
→ operable Reality Object (not a bare place row).

### 6. Candidate Evaluation

AI does **not** invent “the answer.” Planner ranks:

Distance · Price · Rating · Availability · Preference · Route  

Photo quality gate may re-order (Evidence).

### 7. Workspace Patch

**Do not print search results as the product.**

```text
Workspace Patch → + Candidate A/B/C
```

Clear intent → **replace**; soft intent → **refine** (ADR-048).

### 8. Projection

Patch → Map pins · Callouts · Bottom sheet · Compare · Status  
UI renders **Projection only** (never a parallel result store).

### 9. Agent Status

```text
Resolving location… → Searching… → Comparing… → Projection ready.
```

Chat = work log (Laws 1 · 25 breadcrumbs). Dual surface: Callout vs short LLM reply.

### 10. Human Interaction

User taps Hotel A on map → **reuse Workspace Object** (no re-search).  
Same Object → Callout · Sheet · Compare.

### 11. Commit Preparation

「여기 예약해」→ Reservation Draft → Workspace Patch → **Prepare only**  
No booking yet (Article 0 · Law 17 · 22).

### 12. Reality Commit

User approval → Booking API → Reality Update → Workspace Update.

---

## vs Gemini / Cursor

| | Gemini | Cursor | **Rimvio** |
|---|--------|--------|------------|
| Loop | NL → Search → Summary → **Answer** | NL → edit **files** | NL → patch **Reality Workspace** |
| SSOT | Chat / page | Repo | **Workspace** |
| Dangerous | n/a | Diff accept | **Field Reality Commit** |

```text
Natural Language
  → Intent → Workspace → Planner → Reality Objects
  → Workspace Patch → Projection → User Interaction
  → Prepare → Commit
```

---

## Alignment

See `docs/RIMVIO_AGENT_RUNTIME_ALIGNMENT.md` — STEP 1–12 roadmap.

**Wire (alignment):** `lib/context-run/agent-product-pipeline.ts` · `object-discovery.ts` · lodging `rescoutWorkspace`

workstream `enterRimvioAgentRuntime` = internal OS spine (ADR-045).  
Product stages (this doc) = NL → Workspace tape. Both required; neither replaces the other.

## Code map (non-exhaustive)

| Stage | Code |
|-------|------|
| Turn entry | `lib/context-run/apply-globe-workspace-agent-turn.ts` |
| Workspace NL | `lib/context-workspace/try-apply-workspace-lodging-turn.ts` |
| Planner | `lib/action-planner/` · `lib/workstream/` |
| Patch / transition | `lib/context-workspace/apply-workspace-transition.ts` · `workspace-patch/` |
| Reality Provider (absorb) | `lib/reality-provider/` (ADR-051) |
| Mutation mode | `lib/agent-policy/resolve-workspace-mutation-mode.ts` |
| Projection | `lib/context-workspace/projection/` · Map / ObjectPlacePanel |
| Prepare / Commit | `lib/prepare-layer/` · Hub checkout · Article 0 |

## PR reject

- Search results only in assistant text  
- Skip Planner / Task Graph on fresh trip Intent  
- Paint lodging search pins on 3D before Commit  
- Auto Reality Commit from chat  
- New result store bypassing Workspace
- Domain-private Acquire→Projection for rail/events (must use ADR-051)
