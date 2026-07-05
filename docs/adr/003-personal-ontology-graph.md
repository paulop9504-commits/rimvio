# ADR 003: Personal Ontology Graph (Entity Graph)

**Status:** Accepted (2026-07)  
**Related:** ADR-001 (Globe-first home), ADR-002 (archive sync frozen), `RIMVIO_CONSTITUTION.md` §7

## Context

Rimvio has multiple graph-like modules (`lib/meaning/`, `lib/experience-graph/`, `lib/people-graph/`, `lib/knowledge/`, `lib/synaptic/`) without a single L0 write SSOT. `MeaningGraph` is rebuilt on every read; durable edges lack commit-time audit trail.

**Design stance (vs analysis ontology):** Entity Graph exists to **fire recall and gate re-execution** — not for analyst exploration. See `docs/RIMVIO_ONTOLOGY_LAYER.md` § Thesis.

## Decision

1. **Entity Graph** lives in `lib/ontology/` as **L0 Substrate** (`rimvio.entity-graph.v1` localStorage).
2. **Only `commit-truth.ts` writes edges** via synchronous `materializeEntityEdges(committed)` before `scheduleLifeEventVaultSync`.
3. **Every `EntityEdge` requires `evidence`** — at minimum `{ type: "event", id }`.
4. **Write-time: no threshold prune** — all evidence accumulates on upsert. **Read-time: filter** (meaning graph thresholds, archived event exclusion).
5. **Synaptic layer stays separate** — `SynapseEdge` = UI routing plasticity; `EntityEdge` = entity relationships. Never merge stores or types.
6. **v1 storage:** client-only adjacency list (ADR-002 server sync remains frozen).

### Why intent is not an entity node (Phase 1)

Experience **intent** (e.g. `travel`, product complaint) is modeled as **`experience:{normalizedKey}` nodes** connected via `person_experience` / `place_experience` edges — not as a separate `intent` kind. Rationale: intent is a **derived projection of co-occurrence**, not a durable Foundry object with its own commit path. Phase 2 RECALL may add an **intent → entity resolver** (utterance classifier maps to existing graph nodes); that resolver is not stored as a graph node in v1.

### Archived events (Phase 1 safety)

- **Commit:** `materializeEntityEdges` skips `lifecycle === "archived"` (no new edges).
- **Read:** `filterEdgeEvidenceForRecall` / `queryEntityNeighbors({ recallSafe: true })` exclude archived event ids from active evidence — edges persist for audit but do not surface recall-only-on-archived paths.
- **Weaken/prune policy:** Phase 1.1 (explicit edge decay on archive).

## Consequences

| Area | Change |
|------|--------|
| `commit-truth.ts` | Sync `materializeEntityEdges` after `storeUpsert` |
| `lib/meaning/ingest-meaning-edge-buckets.ts` | Shared bucket rules for read + commit paths |
| Knowledge bridge | Phase 2 — adapters only in Phase 1 |
| experience-graph volume edges | Phase 2 — separate kind family with evidence TBD |

## Rejected

- LLM-inferred edges at commit time
- Projection surfaces writing to entity graph directly
- Merging synaptic + entity stores

---

## Extension: Market / Bridge / External Relationship Types (Phase 2 — approved & implemented 2026-07)

### Context

Phase 1 entity graph covers **personal co-occurrence** (person · place · experience · capture · thread) from `EventCandidate` commit. Three relationship families documented in product infra are **not yet modeled** as `EntityEdge` kinds:

| Family | Module | Server SSOT |
|--------|--------|-------------|
| **Market alignment** (구하기/내놓기) | `lib/globe/market/` | `market_intents`, `market_alignment_handshakes` (Supabase) |
| **Experience Bridge** (함께하기) | `lib/experience-bridge/` | `experience_bridges`, `experience_bridge_participants` (Supabase) |
| **External / Public Bridge** (참여하기) | External Globe ingest | external pins · public bridge (Phase 2/3, opt-in) |

### SSOT vs commit-truth (investigation summary)

| SSOT | commit-truth 경유? | Notes |
|------|-------------------|--------|
| `EventCandidate` (personal) | **Yes** — sole write via `commitEventUpsert` | Phase 1 `materializeEntityEdges` hook |
| `market_intents` | **No** — `upsertMarketIntentRemote` → Supabase | Links via `client_event_id` → personal event |
| `market_alignment_handshakes` | **No** — `upsertMarketHandshake` / phase patches → Supabase | Phases: `pending_listing` → `pending_buyer_start` → `active` → `completed` |
| `experience_bridges` / participants | **No** — `server-bridge-store` → Supabase | Bridge rows independent of local event store |
| Bridge link on personal event | **Yes** — `stampBridgeEventMetadata` → `commitEventUpsert` | Host + participant accept paths |
| Market intent globe pin | **Yes** — `syncMarketIntentGlobePin` → `commitEventUpsert` | Place/GPS metadata only |
| Market completion trace | **Yes** — `commitMarketCompletionTrace` → `commitEventUpsert` | After dual-confirm; optional user tap |
| External public bridge | **No** (today) | Separate visibility; personal SSOT must not absorb raw external truth |

### “Relationship confirmed” commit points

**Market handshake**

| Phase | Meaning | Graph-worthy? |
|-------|---------|---------------|
| `pending_listing` | Alignment scored; listing not yet accepted | No — candidate only |
| `pending_buyer_start` | Listing accepted; DM thread created | Weak — channel open |
| `active` | Buyer started chat | **Co-engagement** — bilateral |
| `completed` | Dual confirm (`confirmMarketHandshakeComplete`) | **Trade relationship closed** |
| Trace pin (optional) | `commitMarketCompletionTrace` → new/updated `EventCandidate` | **Personal memory** — already commit-truth |

**Experience Bridge**

| Moment | Writer | commit-truth? |
|--------|--------|---------------|
| Bridge created | `upsertExperienceBridge` | No (Supabase) |
| Participant `accepted` | `updateBridgeParticipantRow` | No (Supabase) |
| Participant pin + metadata | `stampBridgeEventMetadata` / `ensureBridgeParticipantPin` | **Yes** |
| Host share | `share-context-with-friends` → `stampBridgeEventMetadata` | **Yes** |

Phase 1 already emits `thread_mention` on bridge metadata commit; **`co_participant`** (host ↔ participant person edge) is Phase 2.

**External / 참여하기**

- Hard law: External AI uses **anonymized projections** only — never raw photos, messages, location traces, PII (`RIMVIO_EXTERNAL_GLOBE_AI.md`).
- Phase 3: **Personal UI and collective UI are physically separate** — never blend personal SSOT with aggregate insights on one screen (`RIMVIO_EXPERIENCE_LAYERS.md`).
- Therefore **public gathering edges must not land in `rimvio.entity-graph.v1` personal store** without a separate projection boundary.

### Decision (proposed — approval pending)

#### Principle 3 nuance

- **Personal entity graph:** “Commit is sole write” = **`commitEventUpsert` only** for `rimvio.entity-graph.v1`.
- **Market / Bridge server SSOT:** Already **Supabase-authoritative** for cross-user state. ADR-002 “no server sync” applies to **personal graph rollup/archive**, not to negating existing market/bridge tables.

#### Market — **(A) primary + (B) fallback**

**(A) Recommended:** Emit `trade_partner` when a **personal `EventCandidate` commit** carries market completion metadata (`commitMarketCompletionTrace` → `materializeMarketEdgeFromCompletionEvent`).

**(B) Fallback:** When handshake reaches `completed` without a trace pin, client calls `materializeMarketEdge(handshake)` after `confirmMarketHandshakeCompleteRemote`. This is **not a principle relaxation** — it reflects the fact that **Market alignment SSOT lives outside EventCandidate** (Supabase `market_alignment_handshakes`); the personal graph edge is a deterministic projection with `trade` evidence, not a second truth source.

#### Experience Bridge — **(A)**

Participant accept → `stampBridgeEventMetadata` → `commitEventUpsert` → `materializeBridgeCoParticipantEdgeFromEvent` for **`co_participant`**.

#### External — **approved: no personal store write**

- **`gathering_link`**: `materializeGatheringLinkEdge` builds a read-only projection edge; **never** calls `upsertEntityEdge`.

### Consequences (Phase 2 — implemented 2026-07)

| File | Change |
|------|--------|
| `lib/ontology/edge-types.ts` | Phase 2 kinds + evidence in `ENTITY_EDGE_KINDS` |
| `lib/ontology/materialize-entity-edges-phase2.ts` | Writers + commit hook helpers |
| `lib/ontology/materialize-entity-edges.ts` | Calls `materializePhase2EntityEdgesFromEvent` |
| `lib/ontology/entity-types.ts` | Optional `threadKind` on `ThreadEntity` |
| `lib/globe/market/commit-market-completion-trace.ts` | Persists `seekingUserId` / `listingUserId` in completion meta |
| `lib/experience-bridge/stamp-bridge-event-metadata.ts` | Stamps `experienceBridgeParticipantUserId` on accept |

**Market (B) client resilience (next session):** when `materializeMarketEdge` runs after complete API response, failures (offline, tab kill) must not drop `trade` evidence — enqueue pending handshake ids in localStorage (e.g. `rimvio.market-edge-pending.v1`) and retry on next app foreground / successful complete poll.

### ThreadEntity extension (approved)

```typescript
threadKind?: "bridge" | "room" | "market_dm";
```

### Deferred

| Item | Reason |
|------|--------|
| `gathering_link` personal store write | Personal/collective SSOT separation — projection only |
| Market (B) retry queue implementation | Documented above; next session |
| Handshake `pending_*` edges | Not relationships — matching candidates only |
| Server sync of personal entity graph | ADR-002 unchanged |
| Synaptic merge | Forbidden |

### Tests

- `scripts/test-entity-graph-market-edge.ts` — (A) trace + (B) handshake writer
- `scripts/test-entity-graph-bridge-edge.ts` — commit + direct writer
- `scripts/test-entity-graph-gathering-edge.ts` — projection without store write
