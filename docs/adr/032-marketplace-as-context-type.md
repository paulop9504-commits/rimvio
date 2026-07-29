# ADR-032: Marketplace = Context type (not a separate app)

**Status:** accepted 2026-07  
**Wire:** `classifyWorkspaceKind` · `workspace_intent_continuum` · `USED_GOODS_*` · ADR-029/030/031  
**Related:** ADR-024 · ADR-025 · ADR-026 · ADR-031 · Article 0

## One sentence

> **중고거래는 별도 “마켓 앱”이 아니라 Globe 위의 Context 타입이다.**  
> **Globe AI는 팔지 않는다 — Intent → New Context → Domain Agent 만 연다.**

## OS loop (all domains)

```
Globe AI
  ↓ Intent (CREATE_MARKET_CONTEXT · SELL | BUY)
  ↓ New Context (ADR-029)
  ↓ Context AI Agent (Workspace SDK)
  ↓ Reality Objects (사진 · 가격 · 위치 · 후보 · 채팅)
  ↓ Commit (human)
```

Same engine as Travel / Driver / (later) Work · Finance · Health.

## Sell example

```
"아이폰 15 프로 중고로 팔아줘"
  → Intent: sell + object
  → 📦 iPhone 15 Pro 판매 Context
  → Agent: 사진 → 상품 정보 → 가격 → 위치 → 매칭 준비
  → Globe pin + Workspace (not a listing feed as SSOT)
```

## Buy example

```
"맥북 살만한 거 찾아줘"
  → Intent: buy + object
  → 📦 MacBook 구매 Context
  → Agent: 조건 → 가격대 → 판매자 후보
  → Reality objects under that Context
```

## Cross-Context (later)

제주 여행 Context ↔ 카메라 구매 Context = **Reference Link** (ADR-030), not merge.

## Forbidden

- Positioning Rimvio as “당근 대체 검색 앱”
- Market results only as Globe chat essay / flat list without Context
- Parallel marketplace SSOT bypassing Workspace continuum
- Auto-merge travel + buy without user link chip

## Ship notes

1. `WorkspaceKind` + template + classify via `isMarketComposeInput`
2. Personal composer/capture → `workspace_intent_continuum` (not fresh portal wizard)
3. Mint market Context + SDK Host open (ADR-031)
4. Portal resume mid-draft still OK; Field = trade execution
5. Morphology `card_pipeline` — ADR-033 (auto from Context Type)  
