# Globe Hub · Resource — Locked Definition

> **Status:** locked 2026-06-15 · **3-layer storage** locked 2026-07-08  
> **Layer:** L2 Product spec · L3 code SSOT: `lib/globe/context-hub/hub-definition.ts`, `lib/globe/resource/types.ts`, `lib/globe/resource/hub-action-record.ts`  
> **UI copy:** L1 in `lib/copy/human-ko.ts` — never expose 「Hub」「Resource」「Transaction」 in hero/empty/toast.

---

## One picture

```
Context (맥락 — EventCandidate / pin)
  │
  ├─ Hub[]          pipeline · transaction · integration · factory · own View
  │     ├─ creates → Resource[]          (확정 파일)
  │     └─ appends → HubActionRecord[]   (작업 로그 · append-only)
  │
  └─ Ranking Engine (GPS · Now · spacetime · rollup)
        └─ MAIN slot = rank #1 Resource (Hero UI)
              └─ horizontal swipe = rank #2, #3, … (same context only)
```

**Which context is active?** — user taps a context pin (`activeCluster`).  
**Which resource is MAIN?** — per-context resource ranker (`rankContextResources`) — **not the Hub**.  
**What is the action log?** — `HubActionRecord` (search → reserve → purchase → cancel); not `ContextResource.action` CTA.

---

## 3-Layer Storage Model: Context / Resource / Action Log

### 계층 정의

| 계층 | 엔티티 | 저장 여부 | 생성 시점 |
|------|--------|-----------|-----------|
| 맥락 (폴더) | `EventCandidate` (`contextId`) | 예, 의미 루트 | 사용자가 Context 최초 Commit |
| 리소스 (파일) | `ContextResource` | 예, `contextEventId` FK | Hub factory가 Commit 성공·동기화 후 emit |
| 행위 (작업 로그) | `HubActionRecord` | 예, append-only | search / reserve / purchase / cancel 발생 시 |

### 이름 충돌 주의

`lib/globe/context-action-injection`의 `ContextAction` / injection 타입은 **UI handoff 주입용**(예: `open_url` CTA)이며 이력 로그가 아니다.  
새 이력 타입은 **`HubActionRecord`** 로 명명한다. **Action Log ≠ Action Injection**.

### 규칙

1. **search는 Commit 전 단계** — Ghost pin / scout batch / Operator Runtime 후보는 `ContextResource`가 아니다.  
   `HubActionRecord(type: "search")`는 `resourceId: null`로 남을 수 있으며, Context에 가벼운 로그로 귀속되거나 Runtime 전용으로 취급한다.  
   → **Reality Commit 전에는 Resource를 만들지 않는다.**
2. **`ContextResource.action`은 유지** — MAIN에서 누르는 실행 포인터(CTA)이지 이력이 아니다. 이력은 `HubActionRecord`에 별도 저장.
3. **append-only** — cancel / 실패는 Resource를 overwrite하지 않고 `HubActionRecord` 행을 추가한다. 이전 reserve를 무효화할 경우 `supersedesActionId`로 연결.
4. **Capital.Settlement와 분리** — purchase 성공의 `externalRef` / 정산은 네임스페이스만 맞추고 Platform ledger와 섞지 않는다 (Phase 2 문서 별도).

### 흐름

```
search (HubActionRecord, resourceId: null, Runtime 후보)
  → user Commit → ContextResource 생성
  → reserve (HubActionRecord, resourceId FK)
  → purchase (HubActionRecord, 같은 resourceId, 별도 행)
  → [optional] cancel (HubActionRecord, supersedesActionId = reserve/purchase actionId)
```

**L3:** `hub-action-record.ts` (create*) · `hub-action-record-store.ts` (`emitHubActionRecord`) · `context-hub-action-log-metadata.ts` (`contextHubActionLog` on EventCandidate).  
Dual-write: session cache + durable metadata when Context exists. search / reserve / purchase / cancel Confirm→Execute wired.

---

## 1. Hub (허브)

### Definition

Within a user-defined **Context**, the Hub is the **functional container and commerce touchpoint** that pulls in external data or runs end-to-end tasks. It is a **pipeline and transaction subject** — not a ranking engine.

### Roles

| Role | Description |
|------|-------------|
| **Transaction** | Beyond lookup: search, book, purchase, pay — value exchange completed with minimal app exit (phased: handoff → in-app E2E). |
| **Integration** | Connect third-party APIs (airline, lodging, rental, tickets) and sync existing data. |
| **Factory** | On successful transaction or sync, emit a normalized **Resource** object the system can rank and execute. |
| **View** | Own UI for plug-in, connect, checkout — user input and payment live here. |

### System properties

- Has its **own View** (expand panel, connect flow, partner handoff).
- **Does not rank** resources. Display order in expanded hub list may follow category/connect state for **browsing only** — priority for MAIN comes from the Resource ranker.
- Lives **inside one Context**. Never mixes resources from another Context on one Hub surface.

### L3 anchors (today)

| Hub kind | Module |
|----------|--------|
| Departure airport | `connectDepartureHubToContext`, `departure-hub-airports` |
| Ticket ingest | `readContextTicketArtifact`, ticket deep links |
| AI search handoff | `buildContextHubAiSearchHandoff` |
| Service catalog | `context-hub-service-catalog`, `ContextHubServiceId` |

### Phase note

| Phase | Hub capability |
|-------|----------------|
| **Now** | Deep link, handoff, artifact storage, plug-in / unplug |
| **Next** | API sync, in-app checkout, receipt → Resource factory |

---

## 2. Resource (자원)

### Definition

After creation through a Hub, a **Resource** is the **minimal executable unit** managed independently inside a Context, with its own metadata (especially **spacetime**).

### Roles

| Role | Description |
|------|-------------|
| **Independent state** | Not a passive attachment to Hub. Own fields: validity window, pickup place, used/expired, etc. |
| **Ranking target** | Engine reads `spacetime` + user GPS/Now when scoring. |
| **Action subject** | When ranked #1 → **MAIN slot** (Hero): QR, navigate, boarding pass, open ticket URL. |
| **Swipe siblings** | Rank #2+ appear via horizontal swipe in `GlobeHubResourceCarousel` — same Context only. |

### System properties

- **SSOT type:** `ContextResource` in `lib/globe/resource/types.ts`.
- **Created by:** Hub factory (transaction success, link ingest, manual plug-in).
- **Ranked by:** `rankContextResources` (target name; today partial via `rankContextHubServices`).
- **Surfaced by:** `GlobeHubResourceCarousel` index `0` = MAIN Hero; index `≥1` = AUX swipe.

### Minimum schema (L3)

See `ContextResource` — required: `resourceId`, `contextEventId`, `kind`, `sourceHubId`, `spacetime`, `action`, `createdAtIso`.

---

## 3. MAIN slot · Carousel

| UI | Meaning |
|----|---------|
| **MAIN (index 0)** | Just-in-time #1 Resource for this Context at user's Now + place. |
| **→ swipe** | Other Resources in the same Hub inventory, ordered by ranker output. |
| **Hub expand (⌄)** | Hub View — plug-in, connect, full list (browse, not priority engine). |

**Forbidden**

- Context-switch slides inside the resource carousel.
- A separate global action pill that bypasses Resource rank (removed — MAIN is carousel index 0).
- Hub computing MAIN priority internally.

---

## 4. Story Layer mapping

| Layer | Hub | Resource | Action Log | MAIN |
|-------|-----|----------|------------|------|
| **L0** | — | — | — | You were here. And it mattered. |
| **L1 (KO)** | (avoid 「허브」in hero) · 설정/expand OK | 티켓 · 항공 · QR | (no 「트랜잭션」 in hero) | **지금** · 이어가기 |
| **L2** | Hub · Factory · Transaction | Resource · Spacetime rank | HubActionRecord timeline | MAIN slot · JIT Action |
| **L3** | `ContextHubDefinition`, `listContextHubServicesForEvent` | `ContextResource`, `rankContextResources` | `HubActionRecord` (`hub-action-record.ts`) | `GlobeHubResourceCarousel`, index 0 · Phase 3: `MainNativeSurfacePayload` |

---

## 5. Action OS spine alignment

- **Context** ingest axes unchanged (calendar · notification · chat · link) — Hub is **on** Context, not a 5th axis.
- **MAIN 1 + AUX** on Globe = Resource rank #1 + swipe (#2…).
- **Archive → rollup** applies to Resource action telemetry (`globe_hub` / `globe_resource` surfaces).

---

## 6. Implementation checklist (from locked spec)

- [x] `rankContextResources(event, { lat, lng, now })` with spacetime + artifact urgency
- [x] Carousel: index 0 = MAIN Hero; remove cross-context / standalone proactive pill
- [x] Predictive Curation telemetry (`types/telemetry.ts`, `TelemetryLogger`, carousel hooks)
- [x] Ticket plug-in + QR viewer + scan surface (web)
- [x] Native MAIN surface L3 contract (`main-native-surface.ts`, `build-main-native-surface-payload.ts`)
- [x] ApiWakeupController skeleton + weather spacetime gate
- [x] Lodging hub prototype (mock inventory · GPS rank · map strip)
- [x] Globe lodging markers (View-only · ranked inventory)
- [x] `places_lodging` ApiWakeup provider + sync stub
- [x] `ContextResource` factory emit on pin Commit (`contextCommittedResources` · lodging/eatery)
- [x] Committed resources boost MAIN in `rankContextResources` (`merge-committed-resources.ts`)
- [x] Flight connect → committed Resource + `HubActionRecord(reserve)` (`connectDepartureHubToContext`)
- [x] Single scout path emits `HubActionRecord(type: search)` (`runContextConditionAnchorPin`)
- [x] `HubActionRecord` type scaffold (`hub-action-record.ts`)
- [x] `emitHubActionRecord` append-only store + search emit from onboarding parallel
- [x] reserve / purchase / cancel emit on Action Injection confirm → execute (`emit-hub-action-from-commit.ts`)
- [x] Durable Action Log on EventCandidate metadata (`contextHubActionLog` · dual-write)
- [ ] Hub expand = View only; no priority logic


- [ ] Resource kinds: ticket, flight, lodging, rental, media_album, schedule (extend catalog)

---

## 7. Predictive Curation telemetry (non-blocking)

Parallel to archive `ActionTelemetry` (rollup spine) — **does not replace** `recordContextHubTelemetry`.

| Event | When |
|-------|------|
| `RESOURCE_IMPRESSION` | MAIN (index 0) visible — `surface: carousel_main` (web) or `native_main` (OS) |
| `RESOURCE_DISMISSED` | Swipe away from MAIN without execute · includes `dwell_time` |
| `RESOURCE_MANUAL_PICK` | Tap resource at index ≥ 1 |
| `TRANSACTION_CONVERTED` | Hub factory emit (e.g. flight connect) |

- **Types:** `types/telemetry.ts`
- **Logger:** `lib/telemetry/telemetry-logger.ts` — idle batch + `sendBeacon`
- **Ingest:** `POST /api/telemetry/curation` (mock · `persisted: false` until storage phase)
- **UI hook:** `hooks/use-hub-resource-curation-telemetry.ts` → `GlobeHubResourceCarousel`
- **Native hook:** `hooks/use-main-native-surface-sync.ts` → `surface: native_main` on successful sync

---

## 8. Native MAIN surface (Phase 3 — pre-aligned)

> **Status:** spec locked · L3 contract · Capacitor bridge shipped · Widget target wired  
> **Goal:** Same MAIN (carousel index 0) on **Dynamic Island / Live Activity (iOS)** and **ongoing notification (Android)** — not a second ranker or global pill.

### One picture

```
rankContextResources → ranked[0] (MAIN)
  │
  ├─ GlobeHubResourceCarousel index 0     (Phase 1 — shipped)
  ├─ GlobeTicketQrViewer + scan surface   (Phase 2 — shipped web)
  └─ buildMainNativeSurfacePayload()      (Phase 3 — native OS)
        │
        ├─ iOS: ActivityKit · Dynamic Island compact / expanded
        └─ Android: ongoing notification + brightness boost
```

### Rules (locked)

| Rule | Detail |
|------|--------|
| **SSOT** | `MainNativeSurfacePayload` in `lib/globe/resource/main-native-surface.ts` |
| **Source** | MAIN only — `ranked[0]` after `rankContextResources`; Hub never emits surface |
| **Eligibility** | `show_qr` · ticket `open_url`; spacetime window (45m lead · 20m tail) |
| **Brightness** | `preferScanBrightness: true` when QR image present — native sets OS level |
| **L1** | eyebrow 「지금」· CTA from Resource action; never 「Live Activity」「Dynamic Island」 |
| **End** | `validUntil` + tail · user dismiss · context switch → `lifecycle: end` |

### iOS (ActivityKit)

| Mode | UI (reference: Kakao Pay QR in Dynamic Island) |
|------|--------------------------------------------------|
| **compact** | QR thumbnail or ticket icon + L1 short label |
| **minimal** | Icon only when another Live Activity shares the island |
| **expanded** | QR large · place · countdown · tap → app `GlobeTicketQrViewer` + brightness boost |
| **Lock Screen** | Same payload — Live Activity widget |

**Requires:** Capacitor iOS app + Swift Widget Extension + `RimvioMainSurface` plugin (`syncMainSurface` / `endAllMainSurfaces`).

### Android

| Surface | UI |
|---------|-----|
| **Ongoing notification** | QR expanded layout · tap opens app QR viewer |
| **Brightness** | `@capacitor-community/screen-brightness` or `WindowManager.LayoutParams.screenBrightness` while visible |

### L3 modules

| Module | Role |
|--------|------|
| `main-native-surface.ts` | Contract types · eligibility · plugin method names |
| `build-main-native-surface-payload.ts` | MAIN → payload · spacetime gate · `buildMainNativeSurfaceCommand` |
| `scripts/test-main-native-surface.ts` | Contract regression |

### Phase checklist

- [x] L3 payload contract + builder + test
- [x] Capacitor `RimvioMainSurface` plugin bridge (Swift + Java stubs)
- [x] Wire: hub rank revision → `syncMainSurface` via `useMainNativeSurfaceSync`
- [x] Foreground QR → `setScanBrightnessEnabled` (Capacitor)
- [x] Android ongoing BigPicture QR (base64 data URL)
- [x] iOS Live Activity controller + Widget Extension sources (`ios/RimvioLiveActivityWidget/`)
- [x] Xcode: `RimvioLiveActivityWidget` target wired in `project.pbxproj` (Attributes shared; controller App-only)
- [x] Telemetry: `RESOURCE_IMPRESSION` surface=`native_main` (extend curation ingest)

### Forbidden (Phase 3 native)

- Native surface that picks a different resource than web MAIN
- Live Activity started from Hub expand / browse list
- Web/PWA attempting ActivityKit (impossible — reject in review)
- L1 lock screen copy: 「API」「허브」「Live Activity」

---

## 10. Context map flow (허브 연결 → 맥락 → 허브 오픈)

| Step | UX | L3 |
|------|-----|-----|
| **1 · State initiation** | User connects Hub to Context (ticket · flight · lodging · …) | `connectDepartureHubToContext`, `saveContextTicketArtifact`, `enableLodgingHubForContext` |
| **2 · Contextual view** | Map shows hub opener pill offset from context pin — dock rail hidden | `hasActiveContextHub`, `projectContextHubGlobeAnchor` |
| **3 · Hub open** | Tap map pill → full Hub detail (carousel + browse), **not** `PinOpenSheet` | `GlobeContextHubDetailSheet`, `GLOBE_CONTEXT_HUB_OPEN_REQUEST` |

**Rules**

- Pin tap → experience / media (`PinOpenSheet`) unchanged.
- Hub anchor tap → `GlobeContextHubDetailSheet` only.
- `ai_search` handoff is ambient — does not alone activate map anchor (`hasActiveContextHub` excludes it).

---

## 9. JIT API wake-up (Phase 2 — shipped skeleton)

> **Goal:** No external API calls until spacetime probability warrants it. Ranker stays pure; fetch gates sit **before** providers.

```
Hub factory → Resource (lastSyncedAtIso)
       ↓
ApiWakeupController ← scoreSpacetimeFit phase (cold / warm / hot)
       ↓
Provider fetch (weather · flight · ticket_ingest · queue_times · places_lodging)
       ↓
rankContextResources → MAIN
```

| Phase | When | weather_forecast | queue_times | places_lodging |
|-------|------|----------------|-------------|----------------|
| **Cold** | >24h before event | ❌ | ❌ | ❌ |
| **Warm** | ≤24h or timeOk | ✅ 30m | ❌ | ✅ 6h |
| **Hot** | fits or ≤2h + near place | ✅ 20m | ✅ 5m (≤3km) | ✅ 30m (≤25km) |

- **SSOT:** `lib/globe/resource/api-wakeup-controller.ts`
- **Policies:** `api-wakeup-providers.ts`
- **Wired:** `useFeedPlanWeather`, `useBridgeContextEnvironment`
- **Stale:** `ContextResource.lastSyncedAtIso` + `isResourceSyncStale`
- **Worker:** `planHubResourceSyncJobs` → `runHubResourceSyncWorker` · hook `useHubResourceSyncWorker` in `GlobeContextHubRail`
- **Lodging fetch:** `fetchPlacesLodgingNearby` · `GET /api/globe/lodging-inventory` · mock fallback when `GOOGLE_PLACES_API_KEY` unset

### Sync flow

```
rankContextResources revision
  → useHubResourceSyncWorker (debounced)
  → planHubResourceSyncJobs (MAIN first)
  → resolveApiWakeupDecision per provider
  → executeHubResourceProviderSync (stub)
  → writeResourceSyncStamp → EVENT_CANDIDATES_UPDATED
```

### Forbidden

- Hub or Ranker calling third-party APIs without `resolveApiWakeupDecision`
- Fixed 30m weather poll regardless of event distance in time

---

## PR reject

- Hub that ranks or picks MAIN without Resource engine
- Resource without `spacetime` when validity/place matters
- Carousel slides that switch Context
- L1 hero copy: 「커머스」「API」「허브 파이프라인」
- Naming Action Log as `ContextAction` (collides with action-injection handoff)
- Folding search/reserve/purchase history into `ContextResource` / overwriting Resource on cancel
- Emitting `ContextResource` from scout / Ghost pin before Reality Commit
- Mixing `HubActionRecord.externalRef` into Platform ledger / Capital.Settlement without Phase 2 namespace
