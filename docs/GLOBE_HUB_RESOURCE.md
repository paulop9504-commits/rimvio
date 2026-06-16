# Globe Hub · Resource — Locked Definition

> **Status:** locked 2026-06-15  
> **Layer:** L2 Product spec · L3 code SSOT: `lib/globe/context-hub/hub-definition.ts`, `lib/globe/resource/types.ts`  
> **UI copy:** L1 in `lib/copy/human-ko.ts` — never expose 「Hub」「Resource」「Transaction」 in hero/empty/toast.

---

## One picture

```
Context (맥락 — EventCandidate / pin)
  │
  ├─ Hub[]          pipeline · transaction · integration · factory · own View
  │     └─ creates → Resource[]
  │
  └─ Ranking Engine (GPS · Now · spacetime · rollup)
        └─ MAIN slot = rank #1 Resource (Hero UI)
              └─ horizontal swipe = rank #2, #3, … (same context only)
```

**Which context is active?** — user taps a context pin (`activeCluster`).  
**Which resource is MAIN?** — per-context resource ranker (`rankContextResources`) — **not the Hub**.

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

| Layer | Hub | Resource | MAIN |
|-------|-----|----------|------|
| **L0** | — | — | You were here. And it mattered. |
| **L1 (KO)** | (avoid 「허브」in hero) · 설정/expand OK | 티켓 · 항공 · QR | **지금** · 이어가기 |
| **L2** | Hub · Factory · Transaction | Resource · Spacetime rank | MAIN slot · JIT Action |
| **L3** | `ContextHubDefinition`, `listContextHubServicesForEvent` | `ContextResource`, `rankContextResources` | `GlobeHubResourceCarousel`, index 0 |

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
- [ ] `ContextResource` SSOT + factory emit from Hub transactions
- [ ] Hub expand = View only; no priority logic
- [ ] Resource kinds: ticket, flight, lodging, rental, media_album, schedule (extend catalog)

---

## 7. Predictive Curation telemetry (non-blocking)

Parallel to archive `ActionTelemetry` (rollup spine) — **does not replace** `recordContextHubTelemetry`.

| Event | When |
|-------|------|
| `RESOURCE_IMPRESSION` | MAIN (index 0) visible — IntersectionObserver |
| `RESOURCE_DISMISSED` | Swipe away from MAIN without execute · includes `dwell_time` |
| `RESOURCE_MANUAL_PICK` | Tap resource at index ≥ 1 |
| `TRANSACTION_CONVERTED` | Hub factory emit (e.g. flight connect) |

- **Types:** `types/telemetry.ts`
- **Logger:** `lib/telemetry/telemetry-logger.ts` — idle batch + `sendBeacon`
- **Ingest:** `POST /api/telemetry/curation` (mock · `persisted: false` until storage phase)
- **UI hook:** `hooks/use-hub-resource-curation-telemetry.ts` → `GlobeHubResourceCarousel`

---

## PR reject

- Hub that ranks or picks MAIN without Resource engine
- Resource without `spacetime` when validity/place matters
- Carousel slides that switch Context
- L1 hero copy: 「커머스」「API」「허브 파이프라인」
