# Rimvio Globe Architecture — One Globe · Hub · Portal

> **Status:** canonical 2026-07 (ADR-027)  
> **Layer:** L2 Product · L3: `EventCandidate` (SSOT) · `globeLayerMode` · `market_intents` · `context-hub`  
> **Story (L1):** 지구 · 내 맥락 · 발견 — never 「Internal/External Globe」 or 「내 지구/밖 지구」 as two worlds  
> **Related:** [ADR-027](./adr/027-one-globe-reality-context-layers.md) · `docs/RIMVIO_CONSTITUTION.md` · `docs/RFC_UNIVERSAL_PIN_SYSTEM.md` · `docs/GLOBE_HUB_RESOURCE.md`

---

## One line

**One Globe is the Reality Surface.** Reality Entities live on it; the user opens Context Instances and Workspaces on the same surface. Hub chooses a world; Portal projects Context outward (visibility) — discovery is a **lens**, not a second Earth.

---

## Stack (ADR-027)

```
One Globe (Reality Surface)
 ├─ Reality 겹     — Entity pins (place · listing · brand · …)
 └─ My Context 겹  — Context Instance + Workspace (+ Capsule)
        │
        ▼
      Hub (세상 선택 · Portal Launcher)
        │
        ▼
     Portal (투영 설정 · Projection Engine)
        │
        ▼
 discovery lens (read model — same Globe)
```

| Layer | Owns data? | User verb (L1) |
|-------|------------|----------------|
| **Globe** | ❌ Projection only | 지구 · 흔적 · 발견 |
| **Context Instance** | ✅ Yes — sole user SSOT | 맥락 · 작업 |
| **Workspace** | ❌ Execution space | 작업장 |
| **Hub** | ❌ No — launcher only | 세상 고르기 |
| **Portal** | ❌ No — projection only | 외부에 내놓기 / 공개 |
| **discovery lens** | ❌ No — read index | 찾기 · 발견 |

**Archived nouns:** Internal Globe / External Globe as product worlds → use **Context Instance** / **Reality Entity + discovery lens**.

---

## 1. Context Instance (was “Internal Globe”)

### Definition

The **only** place user activity and context are **created** and owned — projected on the **same** Globe.

Everything starts here. Discovery lens **never** creates context.

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
| Workspace | `lib/workspace-sdk/` · ADR-026 |

---

## 2. Reality 겹 + discovery lens (was “External Globe”)

### Definition

**Reality Entities** and **projections** others can discover. Does not own the viewer’s Context. Same Globe; filter with `globeLayerMode: discovery`.

### Roles

- Discovery · search · recommendation · matching
- Aggregates **Market · People · Place** (not separate apps / not a second home)

### Example

User searches **「아이폰15 Pro」** on discovery lens → sees:

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

**Intent-first projection launcher** — maps Context Instance → public / neighbor exposure.

**UI spec:** `docs/RIMVIO_PORTAL_UI_SPEC.md` · **L1 sheet:** `components/portal/rimvio-portal-sheet.tsx`

Flow: **Intent** (내놓기 · 구하기 · 함께하기 · 참여하기) → **Category** → **Projection** (market wizard today).

Portal **does not store** context. Portal **does not create** context.

### Rules

| Rule | |
|------|--|
| Context created only as Context Instance (personal lens) | ✅ |
| Portal only projects existing `eventId` | ✅ |
| One context → one `eventId` → **many** portal projections allowed | ✅ |
| No duplicate context / no clone `EventCandidate` on project | ✅ |

### Market example

```
Context: "아이폰15 Pro 판매" (eventId = e-abc)
    → Portal: 내놓기 → 중고 물품
    → Projection: price · battery · condition · trade region
    → [ 공개 ]
    → Reality / discovery: listing projection (market_intents row)
```

Other users on discovery lens search → find projection → chat (handshake) · Field monitors trades.

### Travel example

```
Context: "통영 여행"
    → Workspace (travel recipe) · lodging Focus
    → Hub/Portal handoff as needed
    → Commit → Field queue / payment
```

### Code (L3) — today vs target

| Portal | Today | Target |
|--------|-------|--------|
| Marketplace | `globe-market-intent-wizard-sheet` | + explicit 「공개」gate before `market_intents` |
| Travel | `context-hub` lodging / departure · Workspace SDK | Workspace-first (ADR-024…026) |
| Job · Property | stub / phase gate | same pattern |

---

## Data flow (canonical)

```text
Context Instance       Hub                 Portal           discovery lens
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
     │◄── manage / recall / Workspace ──────────────────────────────┤
     │   (always SSOT)  │                    │     discover only    │
```

All of the above **project onto one Globe**.

---

## @중고 UX (locked sequence)

1. User creates Context Instance on Globe (composer · photo · memo).
2. User picks **Marketplace Hub** on that context (or used_goods Workspace).
3. **Marketplace Portal** opens (price · condition · trade place · photos).
4. User taps **「공개」** (or equivalent L1) — projection only then.
5. **discovery lens** shows listing/seeking to others (same `eventId` lineage).
6. Owner monitors active listings in **Field · 내 글** — not mixed into personal-trace chrome.

### Pin rule (no double clutter on one chrome)

| Lens | What appears |
|------|----------------|
| `personal` map | Life traces · open Workspaces — **no** grey market trade pin clutter |
| Field · mine | My active listing/seeking |
| `discovery` map | **Others’** market projections + public traces |
| Same `eventId` | One truth · one or more **projection records** — not two contexts |

---

## Forbidden (PR reject)

- ❌ Store Marketplace catalog inside Hub
- ❌ Store context inside Portal
- ❌ Create context only via discovery lens (no Context Instance)
- ❌ Clone / duplicate Context on project
- ❌ Two `EventCandidate` roots for one user action
- ❌ Mix personal-trace hero copy with neighbor discovery CTAs on one strip (use `globeLayerMode`)
- ❌ Teach 「두 개의 지구」 in L1 / onboarding (ADR-027)

---

## Implementation status (2026-07)

| Capability | Status |
|------------|--------|
| Context SSOT (`EventCandidate`) | ✅ Shipped |
| personal / discovery **lens** toggle | ✅ Shipped (L1 nouns → 내 맥락 / 발견) |
| Market pin hidden on personal lens | ✅ Shipped |
| `market_intents` server projection | ✅ Shipped |
| discovery shows others’ market | ✅ Shipped |
| Hub as world launcher | ✅ Shipped (Context Hub + 맞춤) |
| Explicit 「공개」 portal gate | ✅ Shipped |
| Composer mode split (create vs discover) | ✅ Shipped |
| Intent-first Portal | ✅ Shipped (`rimvio-portal-sheet`) |
| Workspace SDK + One Focus | ✅ Shipped (ADR-024…026) |
| One Globe product nouns (ADR-027) | ✅ Docs + L1 lock |

---

## Code symbols (L3 — do not rename to Korean story words)

| Concept | Code |
|---------|------|
| personal lens | `globeLayerMode: "personal"` · `PinScope: "internal"` |
| discovery lens | `globeLayerMode: "discovery"` · `PinScope: "external"` |
| Hub launcher | `context-hub-service-catalog` · hub kind registry (extend) |
| Portal | `rimvio-portal-sheet` → `globe-market-intent-wizard-sheet` · `docs/RIMVIO_PORTAL_UI_SPEC.md` |
| Projection | `market_intents` · `external_globe_traces` · `visibility: external` |
| SSOT | `EventCandidate.id` (`eventId`) |
| Workspace | `lib/workspace-sdk/` |
