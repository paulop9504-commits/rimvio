# Rimvio Surface Layer Polish V1 — Report

**Date:** 2026-06-04  
**Role:** Final UX stability layer on Surface Engine (not a new SSOT)

---

## 1. UX State Model

| State | Trigger | Polish behavior |
|-------|---------|-----------------|
| **active** | Clear high-band intent | Conflict resolution only |
| **idle** | No strong intent, few surfaces | Inject idle starter surface |
| **low_signal** | ≥2 weak mentioned surfaces | Merge travel fragments → one hypothesis |
| **overloaded** | >5 visible surfaces | Collapse to top 3, demote rest to muted |
| **empty** | No life events | Inject Start Here + time-based copy |

---

## 2. Pipeline

```text
Life Read → buildSurfacesFromLife
         → stabilizeSurfaceLayer (UX polish)
         → rankSurfaces
         → enforceSurfaceLaw
         → routeSurfacesToChannels
```

`resolveSurfaces()` returns `uxState` on every frame.

---

## 3. Fallback Surfaces (Mandatory)

| Id | Purpose |
|----|---------|
| `surface:rimvio:start-here` | Universal safety net — 일정 / 최근 활동 / 목표 |
| `surface:rimvio:idle` | Idle copy + starters (운동, 활동) |

**Invariant:** `surfaces.length >= 1` and ≥1 visible surface always.

---

## 4. Learning Integration

- Learning boosts apply in `computeRawPriorityScore` **before** stability.
- Stability **never** removes fallback surfaces (`surface:rimvio:*`).
- Learning may reorder; polish caps prominence (max 3) and collapse overload.

---

## 5. Simplicity Law Enforcement

- One `primary` action per surface (structural + `assertStabilityInvariants`).
- Conflict resolution demotes competing high-band surfaces.
- No technical jargon in user-visible strings (test-guarded).

---

## 6. Risk Report

| Risk | Mitigation |
|------|------------|
| Hidden event surfaces stack | Overload → muted, not deleted |
| Duplicate fallbacks | `hasStartHereSurface` guard |
| rankSurfaces drops hidden | Fallbacks always prominent |
| i18n | Korean copy only in V1 fixtures |

---

## 7. Production Readiness

| Area | Score |
|------|-------|
| Empty/idle guarantee | 9/10 |
| Overload collapse | 8/10 |
| Low-signal merge (travel) | 7/10 — extend types in V2 |
| CI coverage | 9/10 (`test:surface-ux-stability`) |
| UI adoption of `uxState` | 5/10 — optional banner |

**Overall: 8/10** — ready for MVP; wire `uxState` in feed for idle banner.

---

## Success Condition

✅ User always sees a next meaningful action.  
✅ No empty surface list.  
✅ System shows direction, not option overload.
