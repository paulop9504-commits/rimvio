# ADR-033: Context Type → Workspace Morphology (auto, never user-picked)

**Status:** accepted 2026-07  
**Wire:** `lib/workspace-morphology/` · recipes in `lib/workspace-sdk/`  
**Related:** ADR-024 · ADR-025 · ADR-026 · ADR-031 · ADR-032 · Article 0

## One sentence

> **사용자는 Workspace UI를 고르지 않는다.**  
> Intent → Context Type → **Morphology** 가 자동으로 붙고, 여섯 영역 SDK 뼈대는 같다.

## Why

Rimvio is not “a travel app + a market app + …”.  
It is a **Context OS** that materializes the familiar UI of each life domain *inside* one Workspace skeleton.

```
🌍 Globe AI
     ↓ Intent (“오사카 여행 만들어줘”)
Context Type (travel)
     ↓
Morphology (Spatial + Timeline)
     ↓
Workspace SDK Host (Header · AI · Focus · Node · Action · Commit)
```

Forbidden: Settings → “Workspace 종류 선택” · tab per domain app.

## Six regions stay fixed (ADR-026)

Morphology only changes **Node flesh** (+ Focus sequence / Action verbs).  
Never invent a parallel full-screen IA per domain.

| Morphology family | Node feel | Familiar UX |
|-------------------|-----------|-------------|
| `spatial_timeline` | Map + day rail | Maps · Airbnb |
| `card_pipeline` | Cards + stage pipeline | 당근 · 번개 |
| `product_grid` | Product grid + compare | 쿠팡 · 네이버쇼핑 |
| `map_property` | Map + listing cards | 직방 · 네이버부동산 |
| `dashboard_chart` | KPIs + chart | HTS · 토스증권 |
| `canvas_kanban` | Board / stages | Notion · Jira |
| `code_workspace` | Files · Agent · Preview | Cursor |
| `knowledge_graph` | Concept edges | Notion · Anki |
| `tracker_timeline` | Today checklist + trend | Apple Health |
| `calendar` | Time grid | Calendar |
| `ledger` | Books / entries | 가계부 |
| `feed_graph` | Feed + social graph | SNS |
| `business_canvas` | Lean canvas blocks | Pitch / Lean |
| `profile_matching` | Profile ↔ role | LinkedIn |
| `vehicle_dashboard` | Vehicle / route HUD | 카플랫폼 |
| `moodboard` | Visual board | Pinterest |
| `map_simulation` | Map + value model | 부동산 투자 |
| `document` | Doc workspace | 법률 |
| `medical_record` | Clinical chart | EMR |
| `process_flow` | Factory / MES flow | Digital Twin · ERP |

## Live vs catalog

| Context Type | Morphology | Ship |
|--------------|------------|------|
| travel | `spatial_timeline` | **live** |
| driver | `vehicle_dashboard` | **live** (shell) |
| used_goods | `card_pipeline` | **live** (continuum) |
| shopping · real_estate · invest · … | per registry | **catalog** — recipe later |

Catalog rows may exist without classifiers/UI. Do not fake live.

## B2B hook

`process_flow` (Factory Reality / MES) is the same engine:  
Globe → Context Type → Morphology → Domain Agent → Reality Commit.  
Not a second product.

## Reject in review

- UI picker for “지도형 / 칸반형 / 대시보드형”
- Domain that bypasses SDK six regions for a custom app shell
- Morphology without a Context Type (orphaned layout)
- Treating morphology as a user-facing product noun in L1 copy

## Ship notes

1. SSOT registry `lib/workspace-morphology/`  
2. Recipes carry `morphologyId`  
3. Host may branch Node renderer by morphology — Focus stays One (ADR-025)  
4. New domains = Context Type + recipe + morphology row — not a new app  
5. User copy never says “Workspace 종류를 고르세요”  
6. **ADR-034** — Context Type = convenience label over Reality Primitives; Workspace = Projection  
