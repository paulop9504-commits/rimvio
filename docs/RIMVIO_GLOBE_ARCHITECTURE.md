# Rimvio Globe Architecture — Internal · External · Hub · Portal

> **Status:** canonical 2026-06-24  
> **Layer:** L2 Product · L3: `EventCandidate` (SSOT) · `globeLayerMode` · `market_intents` · `context-hub`  
> **Story (L1):** 내 지구 · 밖 지구 — never 「Internal Globe」「Portal」 in hero UI  
> **Related:** `docs/RIMVIO_CONSTITUTION.md` · `docs/RFC_UNIVERSAL_PIN_SYSTEM.md` · `docs/GLOBE_HUB_RESOURCE.md`

---

## One line

**Internal Globe is lived truth; Hub is where you choose a world; Portal is the engine that projects that truth outward; External Globe is where projections are discovered.**

---

## Stack

```
Internal Globe (SSOT · 생성)
        │
        ▼
      Hub (세상 선택 · Portal Launcher)
        │
        ▼
     Portal (투영 설정 · Projection Engine)
        │
        ▼
External Globe (발견 · 읽기 전용)
```

| Layer | Owns data? | User verb (L1) |
|-------|------------|----------------|
| **Internal Globe** | ✅ Yes — sole SSOT | 흔적 · 맥락 · 남기기 |
| **Hub** | ❌ No — launcher only | 세상 고르기 |
| **Portal** | ❌ No — projection only | 외부에 내놓기 |
| **External Globe** | ❌ No — discovery index | 발견 · 찾기 |

---

## 1. Internal Globe (내 지구)

### Definition

The **only** place user activity and context are **created** and owned.

Everything starts here. External Globe **never** creates context.

### Owns

- Photos · memos · schedule · people · chat · location
- `EventCandidate` + captures + personal pins (`scope: internal` default)

### Examples

| Context (one `eventId`) |
|-------------------------|
| 통영 여행 |
| 아이폰15 판매 |
| 친구와 저녁 |
| 병원 방문 |
| 프로젝트 회의 |

### Code (L3)

| Item | Path |
|------|------|
| Truth SSOT | `lib/events/event-candidate.ts` · `commit-truth` |
| Personal pins | `lib/globe/personal-globe-pin-store.ts` |
| Globe mode | `globeLayerMode: personal` · `lib/globe/globe-layer-mode.ts` |
| Composer ingress | `components/globe/globe-context-ingest-bar.tsx` |

---

## 2. External Globe (밖 지구)

### Definition

A **discovery space**. Does not own user data. Shows **projections** from others (and opt-in public traces).

### Roles

- Discovery · search · recommendation · matching
- Aggregates **Market · People · Place** (not separate apps)

### Example

User searches **「아이폰15 Pro」** on External Globe → sees:

- Public listing intents
- Public seeking intents
- Related people · places (phased)

### Code (L3)

| Item | Path |
|------|------|
| Globe mode | `globeLayerMode: discovery` |
| External traces | `visibility: external` on `personal_globe_pins` · `/api/globe/pins` |
| Market discovery (target) | `market_intents` read index — **not** new `EventCandidate` |

---

## 3. Hub

### Definition

Where the user chooses **which external world** a context connects to.

**Hub is not a datastore.** Hub is a **Portal Launcher**.

### UI philosophy

User answers: *「이 맥락을 어떤 세상과 연결할까?」*

Example chips (L1 — no 「Hub」 in hero):

| Launcher | World |
|----------|-------|
| 맞춤 | 중고 거래 |
| 여행 | Travel |
| 티켓 | Ticket |
| 동행 | Companion |
| 채용 | Job |
| 부동산 | Property |

Hub is **not** Marketplace. Hub **starts** the Marketplace Portal.

### Relation to Context Hub (`GLOBE_HUB_RESOURCE.md`)

| Macro Hub (this doc) | Context Hub (existing) |
|----------------------|-------------------------|
| Pick **world** (Market · Travel · …) | Run **pipeline** inside one context (search flight · lodge · ticket) |
| Portal launcher | Transaction · integration · factory · view |
| One step **before** Portal | Executes **after** Resource exists |

Both are **connectors** — neither is SSOT.

---

## 4. Portal

### Definition

**Intent-first projection launcher** — maps Internal context → External world exposure.

**UI spec:** `docs/RIMVIO_PORTAL_UI_SPEC.md` · **L1 sheet:** `components/portal/rimvio-portal-sheet.tsx`

Flow: **Intent** (내놓기 · 구하기 · 함께하기 · 참여하기) → **Category** → **Projection** (market wizard today).

Portal **does not store** context. Portal **does not create** context.

### Rules

| Rule | |
|------|--|
| Context created only on Internal Globe | ✅ |
| Portal only projects existing `eventId` | ✅ |
| One context → one `eventId` → **many** portal projections allowed | ✅ |
| No duplicate context / no clone `EventCandidate` on project | ✅ |

### Market example

```
Internal: "아이폰15 Pro 판매" (eventId = e-abc)
    → Portal: 내놓기 → 중고 물품
    → Projection: price · battery · condition · trade region
    → [ 외부 공개 ]
    → External: listing projection (market_intents row)
```

Other users on External Globe search → find projection → chat (handshake).

### Travel example

```
Internal: "통영 여행"
    → Hub: Travel
    → Portal: dates · party size · origin
    → External Travel World: lodging · flight · rent search handoff
```

### Code (L3) — today vs target

| Portal | Today | Target |
|--------|-------|--------|
| Marketplace | `globe-market-intent-wizard-sheet` | + explicit 「외부 공개」gate before `market_intents` |
| Travel | `context-hub` lodging / departure | Portal fields → external index only |
| Job · Property | stub / phase gate | same pattern |

---

## Data flow (canonical)

```text
Internal Globe          Hub                 Portal              External Globe
(EventCandidate)   (world pick)      (projection config)     (read model)
     │                  │                    │                      │
     │  create context  │                    │                      │
     ├─────────────────►│                    │                      │
     │                  │  launch portal     │                      │
     │                  ├───────────────────►│                      │
     │                  │                    │  project (no new      │
     │                  │                    │  EventCandidate)       │
     │                  │                    ├─────────────────────►│
     │                  │                    │                      │
     │◄── manage / recall ───────────────────────────────────────────┤
     │   (always SSOT)  │                    │     discover only    │
```

---

## @중고 UX (locked sequence)

1. User creates context on **Internal Globe** (composer · photo · memo).
2. User picks **Marketplace Hub** on that context.
3. **Marketplace Portal** opens (price · condition · trade place · photos).
4. User taps **「외부 공개」** (or equivalent L1) — projection only then.
5. **External Globe** shows listing/seeking to others (same `eventId` lineage).
6. Owner manages active listings on **Internal** (맞춤 관리) — not mixed into personal trace map.

### Pin rule (no double pin on one globe view)

| Surface | What appears |
|---------|----------------|
| Internal Globe map | Life traces only — **no** grey market trade pin |
| Internal manage | My active listing/seeking |
| External Globe map | **Others’** market projections + public traces |
| Same `eventId` | One truth · one or more **projection records** — not two contexts |

---

## Forbidden (PR reject)

- ❌ Store Marketplace catalog inside Hub
- ❌ Store context inside Portal
- ❌ Create context on External Globe
- ❌ Clone / duplicate Internal context on project
- ❌ Two `EventCandidate` roots for one user action
- ❌ Mix personal trace clutter with External discovery on one screen (use `globeLayerMode`)

---

## Implementation status (2026-06)

| Capability | Status |
|------------|--------|
| Internal SSOT (`EventCandidate`) | ✅ Shipped |
| 내 지구 / 밖 지구 toggle | ✅ Shipped |
| Market pin hidden on 내 지구 | ✅ Shipped |
| `market_intents` server projection | ✅ Shipped |
| External Globe shows others’ market | ✅ Shipped |
| Hub as world launcher (replace 나의기억/흐름) | ✅ Shipped (Context Hub + 맞춤) |
| Explicit 「외부 공개」 portal gate | ✅ Shipped |
| Composer mode split (create vs discover) | ✅ Shipped |
| Intent-first Portal (L1 → L2 → projection) | ✅ Shipped (`rimvio-portal-sheet`) |

---

## Code symbols (L3 — do not rename to Korean story words)

| Concept | Code |
|---------|------|
| Internal Globe | `globeLayerMode: "personal"` · `PinScope: "internal"` |
| External Globe | `globeLayerMode: "discovery"` · `PinScope: "external"` |
| Hub launcher | `context-hub-service-catalog` · hub kind registry (extend) |
| Portal | `rimvio-portal-sheet` → `globe-market-intent-wizard-sheet` (L3 projection) · `docs/RIMVIO_PORTAL_UI_SPEC.md` |
| Projection | `market_intents` · `external_globe_traces` · `visibility: external` |
| SSOT | `EventCandidate.id` (`eventId`) |
