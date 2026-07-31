# ADR-022: Context Workspace — Cursor-IDE of Context

**Status:** accepted 2026-07 · **Experience lock:** [`docs/RIMVIO_REALITY_OS.md`](../RIMVIO_REALITY_OS.md) (2026-08)  
**Wire:** `lib/context-workspace/` · `components/context-workspace/`  
**Related:** ADR-001 · ADR-011 · ADR-021 · Article 0

## One sentence

**Chat mutates the Workspace; Capsules live on the Globe; Commit roots Reality.**  
Context Workspace = Cursor IDE. Globe = 개인 현실 OS 위의 **살아있는 Context 객체** 지도 (폴더/파일 UI 아님).

### Four layers (locked — see Reality OS)

`Globe (macro) → Context → Workspace (micro) → Reality Entity`  
Globe ≠ Workspace. Chat = work log only.

## Cursor ↔ Rimvio (locked analogy)

| Cursor | Rimvio |
|--------|--------|
| AI Chat | Context AI Assistant |
| Code Workspace (IDE) | **2D Context Workspace** |
| Auto Save | Auto Save **Draft** + **Context Snapshot** (중단해도 상태 유지) |
| Open recent file | Globe Capsule 탭 → **Resume Workspace** |
| Git Commit | **Reality Commit** (Swipe) → Forest에 뿌리 |
| Git Repository | **3D Globe · Context Forest** |

```
Intent → Context 생성 → Workspace 작업 → Auto Save
       → Globe Projection (Capsule / Snapshot)
       → Resume | Reality Commit
```

## Context Capsule (Globe 위 객체 — 파일 아님)

사용자 카피: **맥락** / 여행 이름 (예: Osaka Trip).  
제품 명사: **Context Capsule**.  
일시정지 상태의 별칭: **Context Snapshot** (「저장」보다 「함께 작업하던 순간의 상태」).

📁 Dropbox 폴더 ❌ · 🌍 장소에 앵커된 살아있는 카드 ✅

```
        🌎 Osaka
        ┌─────────────────┐
        │ Osaka Trip      │
        │ 72% · Snapshot  │
        │ 🏨 ✈ 🍣 🚶      │
        │ 계속 작업하기    │
        └─────────────────┘
              ↓ tap
        Context Restore → 2D Workspace Open
```

### Two projections (do not collapse)

| Kind | When | Globe shows | Open does |
|------|------|-------------|-----------|
| **Snapshot** (paused Draft) | 작업 중단 · Auto Save | Capsule card · progress · domain chips | Restore Workspace + AI “이어서?” |
| **Committed** (Reality) | Swipe Commit | Forest node · rooted | Explore / recall / execute — not raw chat dump |

Place **search pins** still must not paint 3D before Commit.  
**Capsule cards** (project objects) may project while Draft/paused — that is Resume UX, not lodging Diff stamp.

### Resume loop

```
"오사카 3박 4일 여행 만들어줘"
  → Context AI / Workspace (항공·호텔·맛집·동선·예약·일정)
  → 사용자 중단 → Auto Save Snapshot
  → Globe Capsule
  → 탭 → Restore → Workspace (72% · checklist · “지난 작업 이어갈까요?”)
```

사용자는 “뭘 하다 말았지?”를 기억할 필요 없음. Globe가 **진행 중 AI 프로젝트 지도**.

### Capsule wire shape (L3 sketch)

```json
{
  "id": "osaka_trip_001",
  "state": "paused",
  "progress": 0.72,
  "workspace": { "lastCursor": "hotel_selection", "openTabs": ["flight","hotel","restaurant"] },
  "aiMemory": { "decisions": ["5성 제외", "도톤보리 접근성 우선"] },
  "projection": { "lat": 34.69, "lng": 135.50, "thumbnail": "…" }
}
```

Domains beyond travel (집·사업·공부…) reuse the same Capsule / Snapshot / Commit grammar.

## Loop (canonical)

```
🧠 Context AI Assistant     의도 이해 (자연어)
        ↓
🗺️ 2D Context Workspace     Workspace Patch (생성·삭제·연결·필터·시뮬·예약·비교)
        ↓
💬 WHY (on demand)          Action · Reason · Impact
        ↓
🟢 Current Context bar      지금 프로젝트 (OS 현재 앱)
        ↓
💾 Auto Save                Draft + Context Snapshot
        ↓
🌍 Globe Capsule            Snapshot 카드 (Resume) 또는 Commit 후 Forest
        ↓
✅ Reality Commit           Swipe — Ontology · Timeline · Memory · History
```

## Philosophy (each layer owns one job)

| Layer | Job |
|-------|-----|
| **Context AI** | 사용자 의도 이해 |
| **2D Workspace** | AI와 자연어로 Context를 **함께 편집**하는 작업 공간 |
| **WHY** | 무엇을(Action) · 왜(Reason) · 어떤 결과(Impact) |
| **Current Context** | 지금 작업 중인 프로젝트 상태 표시줄 |
| **Auto Save** | 모든 변경 → Draft (의식적 Save 없음) |
| **Commit** | 사용자 최종 승인만 Reality / Globe에 반영 |
| **3D Globe** | 편집기 아님 — Commit된 Context Forest **탐색** |

## Chat → Workspace change (core)

AI는 장문 답변을 쓰지 않는다. NL → **Workspace Patch**.

| Utterance | Workspace effect |
|-----------|------------------|
| 제주도 5성급 호텔 찾아줘 | 호텔 노드 생성 |
| A랑 비슷한 호텔 더 찾아 | 노드 추가 (유사) |
| 오션뷰만 / 평점 4.7 이상 | 필터 |
| 이 호텔 삭제 | 노드 삭제 |
| 여기 맛집 추가 | 이종 노드 추가 |
| 동선 최적화 | Route 변경 |
| 비 오면 어떻게 바뀌어? | 시뮬레이션 |
| 예약 가능한 곳만 | 예약 가능만 남김 |

## Always One New Concept (ship UX)

철학 전체는 참이다. **한 화면에 다 가르치지 않는다.**

| Moment | User learns |
|--------|-------------|
| First search | NL이 Workspace를 바꾼다 |
| Node select | 노드가 조작 가능 (WHY on demand) |
| Auto edit loop | Save를 안 눌러도 Snapshot이다 |
| Leave & return | Globe Capsule = “아 맞다, 그거” → Resume |
| Commit Preview | 승인 전에 요약이 있다 |
| Swipe Commit | 내 승인만 Reality에 뿌리내린다 |
| Open Globe | Capsule 지도 + Forest — 편집기가 아님 |

## Progressive disclosure (On Demand UI)

Never stack Chat + Map + Card + WHY + Agent + Simulation at once.

```
평소          Map (+ list) · Current Context bar
선택          Map + Card
WHY           Map + Card + WHY (node/edge 말풍선)
예약          Map + Card + prepare (Agent 명사 숨김)
Commit        Preview → Swipe
```

- WHY = 노드·연결선 **말풍선** (제품 명사 “WHY Layer” 강제 금지)
- Agent / Impact / Simulation = 내부 또는 on-demand — 첫 화면 제품 금지

## Map-needed Search → Workspace first

`lodging · eatery · poi · amenity` (+ scout `activity` → map nodes)

```
"제주도 호텔 / 맛집 / 약국 찾아줘."
  → Workspace Preview (chat embed)
  → 펼치기 → full Workspace edit
  → Auto Save Draft
  → Commit Preview → Swipe
  → Globe
```

Scout = **search engine only**. Output = Workspace Patch. No chat essay dump. No lodging/eatery **search pins** on 3D before Commit (Capsule Snapshot cards are separate).

## Draft / Commit / Globe

| | Law |
|---|-----|
| **Draft / Snapshot** | Auto Save — 데이터뿐 아니라 **AI와 함께 하던 순간의 상태**. Save 버튼 없음 |
| **Capsule on Globe** | Snapshot 카드로 Resume 가능 (폴더 UI 금지) |
| **Commit Preview** | 변경 요약 → **Swipe to Commit** |
| **Commit** | Reality root — Ontology / Timeline / Memory / History / Forest |
| **Globe** | 개인 현실 OS · Capsule 지도 — live map **place-pin edit** 금지 |
| **WHY** | Action · Reason · Impact 말풍선 (on demand) |
| **Tools** | 비교 · 시뮬 · 동선 (thin) |
| **Map** | Workspace default MapLibre; optional MapKit |

## Reject in review

- Chat essay of search results without Workspace patch  
- Lodging/eatery/poi **search pins** on 3D before Commit  
- Dropbox-style 📁 폴더 트리 as primary Globe UX  
- Teaching “파일 저장” as the product verb (use Snapshot / Capsule / 이어하기)  
- Manual Save button as primary path  
- Treating Globe as the street-zoom editor  
- Teaching Agent / Simulation / WHY Layer as chrome on first paint  
- Always One New Concept violated

## Maps

- Workspace **default** = MapLibre 2D (sharp street zoom) — same style family as vector tiles  
- Optional: Apple MapKit when `NEXT_PUBLIC_APPLE_MAPKIT_ENABLED` + JWT secrets  
- Override: `NEXT_PUBLIC_WORKSPACE_MAP_PROVIDER=maplibre|apple_mapkit|placeholder`  
- Apple/Google **apps** = deep links only  
- Gate: `shouldProjectMapResultsToGlobe` — provisional Workspace면 place family 숨김  
- **No 3D↔2D hybrid on the Globe** — Workspace is a separate 2D surface only

## Test

`npm run test:context-workspace` · `npm run test:graph-command-os` · `npm run test:search-tool-diff`
