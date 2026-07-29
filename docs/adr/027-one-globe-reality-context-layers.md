# ADR-027: One Globe — Reality layer + Context layer (no dual planet)

**Status:** accepted 2026-07  
**Wire:** `lib/globe/globe-layer-mode.ts` · `lib/workspace-sdk/` · Field ingress  
**Related:** ADR-001 · ADR-022 · ADR-024 · ADR-025 · ADR-026 · Article 0  
**Supersedes (product nouns):** dual 「내 지구 / 밖 지구」 as two worlds

## One sentence

> **지구는 하나다.** Entity는 Reality 겹에 산다. Intent가 생기면 Context Instance가 열리고 Workspace가 실행한다.

External Globe / Internal Globe는 **엔지니어용 설명**으로만 남긴다. 제품·UI·온보딩에 두 행성을 두지 않는다.

## Model

```
One Globe (Reality Surface)
 ├─ Reality 겹     — 세상 Entity (장소 · 매물 · 상점 · 회사 · 공공)
 └─ My Context 겹  — 내가 연 Instance (여행 · 중고 · 대리 · 업무)
         ↓
    Workspace SDK (six regions)
         ↓
    Commit (human) → Reality mutation
```

| Concept | Owns | User verb (L1) |
|---------|------|----------------|
| **Globe** | Projection only | 지구 · 흔적 · 발견 |
| **Reality Entity** | Shared / indexed truth refs | (핀·카드 — 앱 이름 금지) |
| **Context Instance** | User-owned situation | 맥락 · 작업 |
| **Workspace** | Execution space | 작업장 |
| **Field** | Monitor · match · approve | 맞춤 · 결재함 · 찾기 — **NOT 「밖 지구」** |
| **Commit** | Sole Reality writer | 승인 · 결제 · 반영 |

## Lifecycle (every domain)

```
Compose → Context → Workspace → Agent → Action → Commit
```

Same bones for travel · used_goods · driver · (later) enterprise. Domain = Workspace recipe, not a second globe.

### Used goods (중고) on One Globe

| Step | What |
|------|------|
| Intent | 「아이폰 팔게」 / 「책상 살래」 |
| Context | Context Instance on the **same** Globe |
| Reality | Listing / seller as Entity pins on Reality 겹 |
| Workspace | `used_goods` SDK recipe |
| Field | trades · discovery · mine (execution / monitor) |
| Commit | handshake · payment |

## Lenses (not planets)

`globeLayerMode: personal | discovery` stays as **L3 filter** — **no user toggle UI** (removed 2026-07). Globe home locks to `personal`. Neighbor discovery / published posts open via **Field** (맞춤 · 내 글), not a second Earth.

| Mode | Shows | When |
|------|-------|------|
| `personal` | My Context · private traces | **Default / only chrome** |
| `discovery` | Neighbor / public projections | Programmatic / legacy only — not a product switch |

**Law:** personal copy and discovery copy still **never mix on one chrome strip**.

## Deprecated product nouns

| Avoid (L1 / docs hero) | Prefer |
|------------------------|--------|
| 내 지구 / 밖 지구 / 외부 지구 / 내부 지구 | 지구 · 내 맥락 · 발견 |
| External Globe as home mode name | Reality 겹 / discovery lens |
| Internal Globe as home mode name | Context Instance / Workspace |
| Field = 「외부 지구 통로」 | Field = 실행·모니터 (거래·찾기·내가 올린 것) |

Engineering symbols (`personal_globe_pins`, `globeLayerMode`, `visibility: external`) **do not rename** in this ADR.

## PR reject

- New UI that teaches 「두 개의 지구」 or planet toggle as product story
- Second home route for “external earth”
- Marketplace / Geo Social positioning (unchanged Constitution)
- Building a domain as a separate app instead of Workspace recipe + same lifecycle
- Mixing personal hero copy with neighbor discovery CTAs on one strip

## Doc map

| Doc | Role after this ADR |
|-----|---------------------|
| `RIMVIO_GLOBE_ARCHITECTURE.md` | One Globe + Hub/Portal projection; dual-planet stack archived |
| `FIELD_DASHBOARD_INGRESS.md` | Field = execution ingress |
| `GLOBE_FIELD_ROLE_SEPARATION.md` | Compose vs Field roles (not 내/밖 지구) |
| `RIMVIO_CONSTITUTION.md` | North Star projects to **one** Reality Surface |
| Workspace ADR-024…026 | Unchanged — Context → Workspace on one Globe |
