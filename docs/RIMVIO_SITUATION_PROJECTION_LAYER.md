# Rimvio Situation Projection Layer

> **Status:** locked 2026-07  
> **Stack position:** `RECALL → **REALITY SURFACE** → ACTION` (Situation Projection is one engine inside Reality Surface)  
> **UX SSOT:** `docs/RIMVIO_REALITY_SURFACE.md`  
> **Constitution:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · **Experience stack:** [RIMVIO_EXPERIENCE_LAYERS.md](./RIMVIO_EXPERIENCE_LAYERS.md)  
> **Code SSOT:** `lib/situation-projection/`

---

## One line

**When a recall edge fires, compose solid truth + ghost axes into a read-only situation map — AI may change layout and copy; only Commit promotes ghost → solid.**

**KO:** 맥락이 닿으면, **있는 흔적(사실)** 과 **아직 없는 축(가상)** 을 한 화면에 붙여 보여 준다. 가상은 붙여 보기만; 확정은 Commit뿐.

---

## Why a new layer (not MEANING / not entity graph)

| Layer | Owns | Situation Projection |
|-------|------|----------------------|
| **MEANING** | Learned weights on **committed** patterns | Reads meaning; does not invent axes |
| **Entity graph** | `rimvio.entity-graph.v1` edges with **evidence** | **Never** writes ghost edges here |
| **Synaptic** | Surface routing plasticity | Orthogonal — UI path habit, not situation map |
| **Situation Projection** | `rimvio.situation-projection.v1` manifests | Solid + ghost **layout** only |

---

## Solid vs Ghost (immutable law)

| | **Solid (사실)** | **Ghost (가상)** |
|--|------------------|------------------|
| **Source** | EventCandidate, entity graph, pin | Playbook catalog + `@` registry |
| **Storage** | commit-truth · entity graph | projection manifest cache only |
| **Visual** | Solid line, full opacity | Dotted, muted, “아직 없음” |
| **Edge** | `EntityEdge` with evidence | `ProjectionLink` in manifest only |
| **AI role** | Read + rank solids | **Layout**, emphasis, surface kind — **not** new facts |
| **Promote** | Already committed | User tap → capture / `@` / commit-truth |

**PR reject:** `upsertEntityEdge` from ghost · LLM-written metadata without commit · ghost on personal graph home ranking as if solid.

---

## Pipeline

```text
RECALL trigger (calendar · GPS · notification · link · graph neighbor)
    ↓
readSolidAnchors(eventId | experienceId)     ← entity graph + EventCandidate
    ↓
resolveSituationType(anchors)                ← deterministic classifier
    ↓
loadGhostAxes(playbook[situationType])       ← code catalog, not LLM
    ↓
composeSituationProjectionManifest({         ← merge + optional AI layout pass
  solids, ghosts, trigger, surfaceKind
})
    ↓
writeProjectionManifest (rimvio.situation-projection.v1)
    ↓
Surface render (prep 1-card · situation-map sheet · mind-map)
    ↓
User confirm → commit-truth → materializeEntityEdges (solid only)
```

---

## Situation types (playbook catalog — extensible)

| `situationType` | Example trigger | Ghost axes (direction) |
|-----------------|-----------------|-------------------------|
| `caregiving` | 어머니 · 진단 · 병원 | schedule, place, people, records, insurance, cost |
| `travel` | trip · 제주 · peer | schedule, place, people, packing, budget |
| `trade` | market handshake · completion meta | place, people, cost, thread |
| `collab` | experience bridge accept | people, thread, media, place |
| `generic` | any experience anchor | schedule, place, people, capture |

Axes map to `@` featureIds when registered; until then ghost tap → capture / slot collect.

---

## Surface kinds (AI may choose among these only)

| `surfaceKind` | When | Rimvio IA |
|---------------|------|-----------|
| `prep_card` | One MAIN moment | prep surface (default) |
| `situation_map` | User opened map / multi-axis gap | secondary sheet |
| `mind_map` | User habit / dismiss pattern | `/inbox` or sheet deep link |
| `quiet` | Sensitive · high dismiss | ghost count ≤ 1 |

**Law:** Globe home is not a 3-card feed of ghosts. One thing at a time.

---

## Storage

| Key | Content |
|-----|---------|
| `rimvio.entity-graph.v1` | Solid edges only (ADR-003) |
| `rimvio.situation-projection.v1` | Latest manifests per anchor (read-only projection) |
| EventCandidate SSOT | Truth |

Server sync of projection manifests: **frozen** (same class as personal graph rollup — client projection).

---

## LLM boundary

| LLM may | LLM must not |
|---------|----------------|
| Pick `surfaceKind` among allowed enum | Create ghost axis not in playbook |
| Order ghost axes + one-line rationale copy | Assert user has insurance / diagnosis stage |
| Suggest prep headline wording | Call `commitEventUpsert` or `upsertEntityEdge` |

---

## Relation to Context Orchestration (product term)

**Context Orchestration** = L2 product noun for the whole loop (ingress → projection → `@` execute).  
**Situation Projection** = L4.5 **engineering layer** that implements solid/ghost composition.

---

## Maturity

| Item | Status |
|------|--------|
| Types + playbook + compose (deterministic) | ✓ 2026-07 |
| Hub Runnable pills + brain ingress | ✓ 2026-07 |
| `GlobeContextBrainPills` component | ✓ 2026-07 |
| Knowledge placement suggest | ✓ deterministic |
| Knowledge placement confirm card (capture upload) | ✓ 2026-07 |
| UI mind-map sheet (`GlobeContextMindMapSheet`) | ✓ 2026-07 — brain strip opens full graph |
| AI layout pass (LLM reorder) | ✓ 2026-07 — `applyLlmMindMapLayout` + deterministic fallback |
| In-app Hub checkout (no external exit) | Hub Phase Next |

---

## Tests

- `npm run test:situation-projection`
- `npm run test:situation-projection-brain`
