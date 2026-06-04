# Rimvio Capability Registry V1 — Report

**Date:** 2026-06-04  
**Prerequisite:** Surface Engine V1 + Surface Adoption P2

---

## 1. Capability Ownership Map

| Layer | Owns | Must not |
|-------|------|----------|
| **Surface Engine** | Situation surfaces, primary **capability id** selection | Provider resolution, execution |
| **Capability Registry** | Capability definitions, catalog, provider priority, dispatch payload | UI, life truth |
| **UI** | Render surfaces, dispatch `capabilityId` via `useCapabilityDispatch` | Provider names/URLs |
| **Execution plane** | Open URI / prompt after payload (`executeCapabilityPayload`) | Capability catalog edits |

---

## 2. Capability Lifecycle

```text
Surface.primaryAction.capabilityId
        ↓
UI: dispatchCapability({ capabilityId, inputs })
        ↓
Registry: validateInputs → resolveCapabilityProvider → buildPayload
        ↓
executeCapabilityPayload(uri)  [browser / execution]
```

Providers may be swapped without changing surface or UI contracts.

---

## 3. Capability Catalog

| Id | Category | Providers (priority order) |
|----|----------|----------------------------|
| NAVIGATE | mobility | Kakao Navi, Naver Map, Google Maps, Internal |
| CALL | communication | Phone dialer |
| MESSAGE | communication | KakaoTalk, SMS |
| ALARM | productivity | Rimvio Alarm |
| EMAIL | communication | Mailto |
| CALENDAR | productivity | Rimvio Calendar |
| PARKING | mobility | Kakao (map search) |
| TAXI | mobility | Kakao T |
| SEARCH | productivity | Google search |
| DOCUMENT / SHEET | productivity | Google Docs/Sheets |
| LINK | system | Rimvio link |
| MAP | mobility | Naver, Kakao |
| BOOK_FLIGHT / BOOK_HOTEL / CHECK_IN | travel | Rimvio handoff URIs |
| CONFIRM_PLACE / CLARIFY_GOAL / OPEN_EVENT / DISMISS_SURFACE | surface helpers | Mapped 1:1 |

Full definitions: `lib/capability-registry/capability-catalog.ts`

---

## 4. Provider Routing Model

1. `detectPlatform()` → web | ios | android  
2. Filter providers by `platforms[]`  
3. Sort by `priority` (numeric, higher first)  
4. `dispatchCapability` builds URI via `internal/provider-urls.ts` only  
5. Fallback web URLs attached on payload when needed  

**NAVIGATE example:** default provider `kakao_navi` on all platforms in v1; Naver/Google available via `preferredProviderId` (tests).

---

## 5. Migration Plan

| Phase | Work |
|-------|------|
| **V1 (now)** | Registry + Surface `capabilityId` + feed dispatch hook |
| **V2** | Route `action-dispatcher/registry.ts` through `dispatchCapability` shim |
| **V3** | Orchestrator emits `capabilityId` wires instead of `action_id` |
| **V4** | Deprecate `ACTION_INTENT_REGISTRY` duplicate URLs |

---

## 6. Risk Report

| Risk | Mitigation |
|------|------------|
| Dual registries (action-dispatcher vs capability-registry) | Shim in V2; boundary test blocks UI imports |
| Provider URLs still in registry `internal/` | Allowed; banned outside `lib/capability-registry/` |
| Feed inputs incomplete for CALL/MESSAGE | Extend input mapping from event metadata P2 |
| Legacy inline chips still use `buildKakaoMapSearchHref` | Migrate to `dispatchCapability(NAVIGATE)` P2 |
| `executeCapabilityPayload` in registry | Documented as execution helper; only called from UI hook |

---

## 7. Production Readiness Score

| Criterion | Score |
|-----------|-------|
| Contract + catalog | 9/10 |
| Provider isolation | 9/10 |
| Surface integration | 8/10 |
| UI adoption | 7/10 (feed wired; dock still uses wire adapter) |
| CI enforcement | 9/10 |

**Overall: 8/10** — Registry is canonical; legacy action-dispatcher remains for orchestrator paths.

---

## Tests

```bash
npm run test:capability-registry
npm run test:surface-engine
npm run test:mvp
```

**Success condition:** Surfaces reference `NAVIGATE`; only `lib/capability-registry/` knows Kakao/Naver/Google provider URIs.
