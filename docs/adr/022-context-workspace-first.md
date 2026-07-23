# ADR-022: Context Workspace — Cursor-IDE of Context

**Status:** accepted 2026-07  
**Wire:** `lib/context-workspace/` · `components/context-workspace/`  
**Related:** ADR-001 · ADR-011 · ADR-021 · Article 0

## One sentence

**Chat mutates the Workspace; Commit roots the Globe.**  
Context Workspace = Cursor의 IDE. 3D Globe = Commit된 Context Forest (편집기 아님).

## Cursor ↔ Rimvio (locked analogy)

| Cursor | Rimvio |
|--------|--------|
| AI Chat | Context AI Assistant |
| Code Workspace (IDE) | **2D Context Workspace** |
| Auto Save | Auto Save **Draft** (Save 버튼 없음) |
| Git Commit | **Reality Commit** (Swipe to Commit) |
| Git Repository | **3D Globe · Context Forest** |

```
대화 → 자연어로 Workspace 편집 → Auto Save (Draft) → Commit → Globe 반영
```

## Loop (canonical)

```
🧠 Context AI Assistant     의도 이해 (자연어)
        ↓
🗺️ 2D Context Workspace     AI가 답을 쓰는 게 아니라 Workspace를 수정
        ↓                     (생성 · 삭제 · 연결 · 필터 · 시뮬 · 예약 · 비교)
💬 WHY Layer (on demand)    Action · Reason · Impact
        ↓
🟢 Current Context (bar)    지금 어떤 프로젝트인지 (OS의 현재 앱)
        ↓
💾 Auto Save Draft          항상 Draft — Save 버튼 없음
        ↓
✅ Commit Preview           변경 요약 → Swipe to Commit
        ↓
🌍 Globe Projection         Commit된 Context만
                            Ontology → Knowledge → Timeline → Memory → History → Forest
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
| First search | NL이 지도를 / Workspace를 바꾼다 |
| Node select | 노드가 조작 가능 (WHY on demand) |
| Auto edit loop | Save를 안 눌러도 Draft다 |
| Commit Preview | 승인 전에 요약이 있다 |
| Swipe Commit | 내 승인만 Globe에 간다 |
| Open Globe | Forest — 편집이 아니라 탐색 |

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

Scout = **search engine only**. Output = Workspace Patch. No chat essay dump. No 3D Globe stamp before Commit.

## Draft / Commit / Globe

| | Law |
|---|-----|
| **Draft** | Workspace 변경 = Auto Save → `localStorage` (새로고침 복원). Save 버튼 없음 |
| **Commit Preview** | 변경 요약 → **Swipe to Commit** |
| **Commit** | Reality Commit만 Globe / Ontology / Timeline / Memory / History에 반영 |
| **Globe** | Context Forest 탐색 — live map edit 금지 |
| **WHY** | Action · Reason · Impact 말풍선 (선택/변경 시 on demand) |
| **Tools** | 비교 · 비 오면(시뮬) · 동선 최적화 (thin) |
| **MapKit** | `GET /api/apple-mapkit-token` JWT · `NEXT_PUBLIC_APPLE_MAPKIT_ENABLED` |

## Maps

- Workspace **default** = MapLibre 2D (sharp street zoom) — same style family as vector tiles  
- Optional: Apple MapKit when `NEXT_PUBLIC_APPLE_MAPKIT_ENABLED` + JWT secrets  
- Override: `NEXT_PUBLIC_WORKSPACE_MAP_PROVIDER=maplibre|apple_mapkit|placeholder`  
- Apple/Google **apps** = deep links only  
- Gate: `shouldProjectMapResultsToGlobe` — provisional Workspace면 place family 숨김  
- **No 3D↔2D hybrid on the Globe** — Workspace is a separate 2D surface only

## Reject in review

- Chat essay of search results without Workspace patch  
- Globe stamp before Commit (any map place family)  
- Teaching Agent / Simulation / WHY Layer as chrome on first paint  
- Manual Save button as primary path  
- Treating Globe as the editor for live search results  
- Always One New Concept violated (여러 새 명사 동시 도입)

## Test

`npm run test:context-workspace` · `npm run test:graph-command-os` · `npm run test:search-tool-diff`
