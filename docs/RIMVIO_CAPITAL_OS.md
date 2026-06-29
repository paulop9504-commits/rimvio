# Rimvio Capital OS — direction lock & prep

> **Status:** 2026-06 — **direction locked** · **implementation NOT started**
>
> **Intent:** 나중에 금융을 붙일 때 **선이 꼬이지 않게** 이름·경계·SSOT 규칙만 미리 고정. 지금은 Globe / Experience / Field 작업이 우선 — Capital C0+ 코드는 **명시적 요청 전까지 착수 금지**.
>
> **Related:** [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · [RIMVIO_ARCHITECTURE_BOUNDARIES.md](./RIMVIO_ARCHITECTURE_BOUNDARIES.md) · [GLOBE_FIELD_ROLE_SEPARATION.md](./GLOBE_FIELD_ROLE_SEPARATION.md) · [PLATFORM_OS_ARCHITECTURE.md](./PLATFORM_OS_ARCHITECTURE.md)

---

## Prep now vs build later

| **지금 (prep)** | **나중 (connect)** |
|-----------------|-------------------|
| 방향·이름·폴더 경계 문서화 | `LifePlanNode` · 재무 FACT ingest |
| `EventCandidate` + `planContext` 확장 여지 유지 | Macro projection feed |
| Field Market ≠ Macro Graph 혼용 금지 | Fusion · L3 `@` + ledger |
| PR에서 금융 히어로·병렬 SSOT reject | UI surface |

**While building Globe / Run / Hub today:** treat every new feature as **Event Graph depth** — money nodes will **attach to the same events**, not a second app.

---

## One-line test

**"이 기능이 투자 추천 앱인가, 아니면 인생 자금 실행 계획의 한 조각인가?"**

| | Investment advisor (reject as category) | **Rimvio Capital OS (this doc)** |
|--|----------------------------------------|----------------------------------|
| 질문 | 무엇을 살까? | 이 목표를 **실행 가능한 자금 흐름**으로 만들 수 있을까? |
| 입력 | 시장·종목 | **삶의 이벤트** + 현금·부채·소비·목표 |
| 출력 | pick list | **실행 계획** (현금·대출·보험·세금·소비·사업자금·투자) |
| 투자 엔진 | 제품 전체 | 계획 안의 **한 슬롯** (`@rebalance` 등) |

**User-facing (L1):** 투자비서 · 포트폴리오 · 종목 추천 — hero/empty 금지.  
**Product (L2):** Capital OS · Life Plan · Fusion · execution plan.  
**Engineering (L3):** `LifePlanNode` · `FinancialFact` · `MacroProjection` · `FusionScenario` · `@` registry + L3 ledger.

---

## Positioning

Rimvio finance is **AI CFO (personal Chief Financial Officer)** — not a robo-advisor SKU.

Example ingress:

> "내년에 결혼하고, 2년 뒤 집 사고, 5년 뒤 창업할 거야."

The system holds **one execution plan** across:

- cash & buffers  
- loans & rates sensitivity  
- insurance & tax triggers  
- consumption ceilings  
- business capital (separate ledger)  
- **investment** (allocation under constraints — not the hero)

---

## Three graphs (moat)

```text
Event Graph                    Macro Graph
(일정·목표·소비·이동·관계·자산)   (금리·환율·인플·섹터·거시 — read projection)
         \                         /
          \                       /
           ▼                     ▼
              Fusion engine
    (시나리오 · 달성 확률 · 현금 갭 · 분기 실행)
                       │
                       ▼
              MEANING → RECALL → ACTION (@)
```

### 1. Event Graph (life + money nodes)

Extends existing Experience spine — **same SSOT**, new node types:

| Node | Examples | Rimvio today |
|------|----------|--------------|
| Life milestones | 결혼 · 주택 · 창업 | `planContext` on `EventCandidate` (partial) |
| Cash & accounts | balance, runway | not wired |
| Liabilities | mortgage, student loan | not wired |
| Consumption | monthly cap, category | capture fragments only |
| Insurance / tax | renewal, filing windows | not wired |
| Business capital | corp vs personal | not wired |
| Relationships | co-signer, partner budget | peer / bridge (partial) |

**Law:** Financial facts ingest into `EventCandidate` lineage (FACT) — never a parallel "finance DB" without commit path.

### 2. Macro Graph (capital markets environment)

Read-only **projection** of external conditions:

- policy rates, yield curve shape  
- FX, inflation prints  
- sector / regime labels (not stock tips)

**Not** the same as **Field Market** (neighbor listings / trades). See naming below.

### 3. Fusion

Combines Event + Macro to answer **constraint optimization** questions, e.g.:

> "다음 18개월에 집 살 가능성이 높은데, 현재 금리 환경에서 현금·채권·주식 비중이 목표 달성 확률을 어떻게 바꾸나?"

Outputs:

- scenario labels (not black-box scores in UI)  
- quarterly **execution deltas** (save more, defer purchase, refinance window)  
- optional allocation **slot** for investment actions  

Fusion lives at **MEANING** layer — structured fields + deterministic templates first; LLM prose second.

---

## Naming law (avoid collisions)

| Term in docs/code | Means |
|-------------------|--------|
| **Field Market** | 이웃 listing · handshake · trades (`market_intents`, Field Dashboard) |
| **Macro Graph** | 금융시장·거시 환경 projection |
| **Capital OS** | Life plan + financial nodes + fusion + execution |
| **Investment slot** | One `@` domain under an approved `FusionScenario` |

**PR reject:** Using "market" alone in capital features without `macro` / `field` qualifier.

---

## Experience layer mapping

| Layer | Capital OS role |
|-------|-----------------|
| **FACT** | 계좌 스냅샷, 영수증, 대출 약정, 사용자가 말한 목표, 일정 |
| **EXPERIENCE** | `LifePlanNode` — "결혼→주택→창업" bundled horizon |
| **MEANING** | Fusion: why this cash gap / allocation **now** given Macro |
| **RECALL** | "금리 상승 주 + 대출 상환일" · "만기 3일 전" |
| **ACTION** | `@transfer` `@insurance` `@consumption_cap` `@rebalance` — L3 rules |

Build order unchanged: **do not ship ACTION picks without EXPERIENCE + MEANING context.**

---

## What life feels like (target)

- Goals are **nodes on the same graph** as trips, places, and people — not a separate spreadsheet.  
- Macro is **background state**, not a news feed.  
- One **execution plan** replaces siloed banking / budgeting / brokerage apps for *decisions*.  
- Investment is **one line in the plan**, surfaced only when Fusion says it moves the goal.  

Globe / Feed / Run work **feeds Event Graph depth** (where, when, who) — Capital OS **adds money edges** to the same nodes.

---

## Build phases (when scheduled — not now)

| Phase | Work | User sees |
|-------|------|-----------|
| **C0** | `LifePlanNode` schema + multi-horizon goals on `EventCandidate` | "내년 결혼 · 2년 뒤 집" one plan |
| **C1** | `FinancialFact` ingest (cash, debt, insurance dates) | runway · 갭 한 줄 |
| **C2** | Macro Graph projection (read-only labels) | "지금 금리 환경" chip |
| **C3** | Fusion scenarios (probability / gap — no stock list hero) | 분기 실행 제안 |
| **C4** | Investment `@` under `compose-financial-v1` + ledger | confirm-gated rebalance |

**Current (2026-06):** prep only — Memory / Globe Event Graph first. **Do not start C0–C4** until explicitly scheduled.

**Frozen until C3:** Public stock rankings · daily "buy this" push · auto-trade without mandate envelope.

---

## Prep checklist (active — use in every PR)

1. **One truth spine** — life + money facts → `commitEventUpsert` / `EventCandidate`; no `finance_events.v1` localStorage fork.
2. **Situations stay in `plan-context`** — travel/출장 Run today; multi-horizon life goals **extend** `PlanContext` later, don't duplicate.
3. **Three namespaces** — see [RIMVIO_ARCHITECTURE_BOUNDARIES.md](./RIMVIO_ARCHITECTURE_BOUNDARIES.md#reserved-namespaces-capital-prep):
   - `lib/globe/market/` = **Field Market** (listings, handshakes)
   - `lib/capital/` = **Capital OS** (reserved, empty until C0)
   - `lib/markets/` = travel/commerce intent probes — not macro finance
4. **Macro is projection** — rates/FX/regime never write SSOT; read-model only when built.
5. **Surfaces** — personal CFO UI ≠ Field trades sheet; ingress bridges only (like Globe→Field today).
6. **Story layer** — no 투자비서/종목 hero in empty states while prep continues.

---

## Engineering alignment (future)

| Concern | Direction |
|---------|-----------|
| Truth writes | `commitEventUpsert` + financial metadata families |
| Life horizons | extend `lib/plan-context/` → `LifePlanNode` |
| Macro feed | `lib/capital/macro/` projections — no SSOT |
| Fusion | `lib/capital/fusion/` — reads life read-model + macro |
| Execution | `PLATFORM_OS_ARCHITECTURE.md` L3 · `ledger_financial` |
| Secrets / PII | `RIMVIO_PERSONAL_VAULT.md` |

---

## PR reject (Capital OS)

- Hero UI: 종목 랭킹 · "오늘의 추천 ETF"  
- Generic robo-advisor chat without `LifePlanNode` context  
- Mixing Field listing browse with personal CFO flows on one screen  
- L3 payment/transfer without idempotency + ledger + confirm  
- New truth store for "AI portfolio" outside event lineage  

---

## Story layer (user copy)

Use L1 from `lib/copy/human-ko.ts` — e.g. 맞춰 뒀어요 · 목표 · 실행 · 그때 거기.  
Avoid: 투자비서 · 포트폴리오 · 종목 · 좋아요 · 별점 (existing story-layer rules).

---

*Locked direction 2026-06 · prep phase — connect finance when scheduled, not before.*
