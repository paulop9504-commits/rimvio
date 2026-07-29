# ADR-026: Workspace SDK — six regions for every platform

**Status:** accepted 2026-07  
**Wire:** `lib/workspace-sdk/`  
**Related:** ADR-022 · ADR-024 · ADR-025 · Article 0

## One sentence

> Rimvio 안의 모든 Workspace는 **같은 뼈대**를 쓴다. 도메인만 바뀐다.

사용자는 “새 앱”을 배우지 않는다. **“Workspace가 하나 더 생겼네.”**

## Six regions (mandatory)

| # | Region | Role |
|---|--------|------|
| 1 | **Header** | Workspace identity (Osaka Trip · 아이폰 구매) |
| 2 | **AI** | Context AI strip / prompt inside this Workspace |
| 3 | **Primary Focus** | The one job right now (ADR-025) |
| 4 | **Node** | Focus body (cards · map · thread) |
| 5 | **Action** | Primary verb (예약 준비 · 채팅 · 길찾기) |
| 6 | **Commit** | Human Reality gate (결제 · 반영) — Article 0 |

```
┌─ Header ───────────────────┐
│  Osaka Trip                │
├─ AI ───────────────────────┤
│  여행 도우미 · strip hint  │
├─ Primary Focus ────────────┤
│  현재 작업 · 숙소 선택      │
├─ Node ─────────────────────┤
│  호텔 카드들                │
├─ Action ───────────────────┤
│  [예약 준비]                │
├─ Commit ───────────────────┤
│  [결제 · 반영]  (human)     │
└────────────────────────────┘
```

## Same bones, different flesh

Morphology (ADR-033) chooses Node feel automatically from Context Type.  
User never picks “지도형 / 칸반형”.

| Kind | Morphology | Header | Focus | Action | Commit |
|------|------------|--------|-------|--------|--------|
| travel | `spatial_timeline` | Osaka Trip | 숙소 선택 | 예약 준비 | 결제 |
| used_goods | `card_pipeline` | 아이폰 구매 | 사진 · 파이프라인 | 채팅 | 거래 확정 |
| driver | `vehicle_dashboard` | 대리 작업장 | 수요 지역 | 길찾기 | 목표 확정 |

## Lifecycle

```
prepared → focused → action_ready → awaiting_commit → committed
```

Commit never auto-fires. Payment Hub is a Commit surface, not a separate app.

## Why SDK

- **100 internal platforms** share Header/AI/Focus/Node/Action/Commit  
- Learning cost ≈ 0 across travel · trade · driver · …  
- Engineering: one host component; recipes plug kind content  

## Reject in review

- Workspace UI missing any of the six regions  
- Kind-specific full-screen layouts that bypass the SDK frame  
- Commit without `requiresHuman: true`  
- Treating each new domain as a new product IA (tabs/apps) instead of a new recipe
