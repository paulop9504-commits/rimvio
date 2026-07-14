# Rimvio Exploration Policy — Convergent vs Diffuse Scout

**Audience:** L2 Product · L3 Globe discovery · Operator turn  
**Law:** deterministic policy first · LLM only for chip/copy · no user-facing σ math

Related: [`RIMVIO_OPERATOR_TURN.md`](./RIMVIO_OPERATOR_TURN.md) · [`RIMVIO_CONTAINER_AI.md`](./RIMVIO_CONTAINER_AI.md)  
Code: `lib/globe/discovery-policy/`

---

## Concept (internal)

| Mode | User intent (L1) | Distribution | Failure tolerance |
|------|------------------|--------------|-------------------|
| **`convergent`** | 검증된 곳 · 실패 적게 | σ↓ — rating/landmark center mass | High — strict guard, fewer pins |
| **`diffuse`** | 새로운 곳 · 골목 · tail | σ↑ — novelty/distance tails | Lower — relaxed guard, more pins |

Do **not** label users “초심자/숙련자” in UI. Mode is **per turn / per scout**, inferred from vibe + NL cues.

---

## Resolution (deterministic)

`resolveExplorationMode()` — no LLM.

| Signal | Mode |
|--------|------|
| Default / first scout | `convergent` |
| `vibe: popular` · `quiet` | `convergent` |
| `vibe: local` · `hot` | `diffuse` |
| `isAlternatePlaceSearch` (“다른 곳”) | `diffuse` |
| NL: 숨은 · 골목 · 새로운 · hidden · secret | `diffuse` |
| Explicit landmark query (Disney, etc.) | `convergent` |

---

## Knobs (`applyExplorationMode`)

| Knob | Convergent | Diffuse |
|------|------------|---------|
| `pinCap` | 3 | 5 |
| `recommendCap` | 8 | 8 |
| Guard threshold (eatery) | 0.5 | 0.35 |
| Guard threshold (activity/amenity) | 0.85 | 0.72 |
| Eatery retrieval `maxResults` | 14 | 18 |
| Eatery present cap | 6 | 8 |
| Activity present cap | 4 | 6 |
| Landmark pin cap | 1 | 3 |

### Intent-converged boost (`applyConvergedIntentCapBoost`)

When cuisine / brand / dish focus is locked (e.g.「초밥」「맥도날드」), surface budget expands on top of mode knobs:

| Knob | Floor when converged |
|------|----------------------|
| `pinCap` | ≥ 6 |
| `recommendCap` | ≥ 14 |
| `eateryMaxResults` | ≥ 28 |
| `eateryPresentCap` | ≥ 14 |
| `feedInventoryCap` | ≥ 40 |
| Feed initial reveal | 8 (vs 4) |

Score temperature (`ratingWeight` / `noveltyWeight`) → `explorationScoreBias()` in eatery/place scorers (shipped).

---

## Wiring

```
User turn → Operator SSOT (optional explorationMode)
         → resolveExplorationMode(message, spec.vibe)
         → applyExplorationMode()
         → verifyDiscoveryResults({ guardThreshold })
         → pickTopLocalDiscoveryRows({ cap: pinCap })
```

Operator turn SSOT may carry `explorationMode` for logging; scout ACT always re-resolves from message + spec + chip override (`exploration-mode-session-store`).

### UI (L1)

- Chips: **검증된 곳** (`convergent`) · **새로운 곳** (`diffuse`) — `GlobeContextExplorationModeChips`
- Tap re-scouts with updated vibe/guard/caps; diffuse excludes prior batch place ids

---

## Forbidden

- Exposing σ, percentile, or “AI confidence” in UI
- User grade “beginner/expert” profile tied to mode
- LLM choosing convergent vs diffuse at runtime
- Public star-rank hero copy (Story Layer L1)

---

## PR check

- [ ] Mode resolved without LLM
- [ ] Guard + cap change with mode; category integrity never fully disabled for activity/lodging
- [ ] L1 chips use 검증된 / 새로운 — not internal mode ids
