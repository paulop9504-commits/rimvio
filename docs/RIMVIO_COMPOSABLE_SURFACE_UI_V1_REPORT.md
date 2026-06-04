# Rimvio Composable Surface UI Architecture V1 — Report

**Date:** 2026-06-04  
**Model:** Surface Engine → Surface Graph → Composition Layout → MFE Registry → Runtime

---

## 1. Architecture Flow

```text
resolveSurfaces()                    [Surface Engine + UX stability]
        ↓
composeSurfaceFrame()                [lib/surface-composition]
        ↓
SurfaceGraph (nodes + mfeId + slots)
        ↓
CompositionLayout (top / primary / secondary / dock caps)
        ↓
SurfaceCompositionRuntime            [components/surface-composition]
        ↓
MfeRenderer → PrimarySurfaceMF | Idle | StartHere | IntentMerged | StackCollapsed
```

---

## 2. Layout Slots

| Slot | Rule |
|------|------|
| `top_context` | Optional narration line |
| `primary` | **Exactly one** dominant surface + single CTA |
| `secondary` | Max 3, **no primary CTA** (`SecondarySurfaceMf`) |
| `action_dock` | External slot (PredictiveActionDock in feed) |

---

## 3. UX State → MFE Mapping

| UX State | Primary MFE |
|----------|-------------|
| `active` | Type-specific (`TravelSurfaceMF`, …) |
| `idle` | `IdleSurfaceMF` |
| `empty` | `StartHereSurfaceMF` |
| `low_signal` | `IntentMergedSurfaceMF` |
| `overloaded` | `SurfaceStackCollapsedMF` (top 3, one CTA) |

---

## 4. Ownership Boundaries

| Layer | May | Must not |
|-------|-----|----------|
| `lib/surface-composition` | Build graph, resolve slots, MFE ids | Render React |
| `components/surface-composition` | Render props from `SurfaceNode` | Rank, merge, learn |
| `hooks/use-surface-composition` | Subscribe engine + compose frame | Local surface decisions |
| Surface Engine | Rank, stabilize, route | Import UI |

---

## 5. Interaction Model

```text
Tap PrimaryActionButton
  → onDispatchCapability(capabilityId)
  → Execution Plane
  → EVENT_CANDIDATES_UPDATED
  → useSurfaceComposition recomposes frame
```

---

## 6. Performance

- `memo` on all MFEs + runtime
- `surfaceCompositionFrameKey` for diff-friendly keys
- Lazy expansion: stack peers are title-only (no extra CTAs)

---

## 7. Risk Report

| Risk | Mitigation |
|------|------------|
| Duplicate narration | `top_context` uses primary narration once |
| Secondary competition | `SecondarySurfaceMf` hides primary CTA |
| Legacy `SurfaceFeedStrip` | Delegates to `composeSurfaceFrame` |

---

## 8. Production Readiness

| Area | Score |
|------|-------|
| Contract / graph | 9/10 |
| Feed adoption | 8/10 |
| Calendar/chat slots | 6/10 — still channel lists |
| Lazy MFE code-split | 5/10 — future `dynamic()` |

**Overall: 8/10** — feed is composable runtime; extend to chat/calendar shells in V2.

---

## Success Condition

✅ ONE dominant primary action per feed context  
✅ UI is stateless renderer of `SurfaceCompositionFrame`  
✅ No ranking/learning in MFEs  
✅ Capability dispatch only on user tap
