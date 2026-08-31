# ADR-066: Platform Economy Flywheel

**Status:** accepted 2026-08  
**Wire:** `lib/rimvio-index/` · `lib/contributor-ledger/` · `lib/capability-ledger/` · `lib/reality-data-network/` · `lib/hub/`  
**Related:** ADR-045 · ADR-049 · ADR-063 · ADR-065 · `docs/RIMVIO_PRODUCT_DEFINITION.md`

## One sentence

> **Rimvio starts from real Projects (demand), builds Platforms fast by reusing Capabilities, and grows the Main Agent through a Contributor economy where Developers, Users, Verifiers, Experts, and Businesses supply value — Rimvio controls Execution, Contributors own supply.**

## Four principles (locked)

| # | Principle | Rule |
|---|-----------|------|
| 1 | **Reuse Before Create** | Search Registry first; block create when ≥80% similar Capability exists |
| 2 | **Improve Before Fork** | Prefer Improvement Task → Developer upgrade over new Capability |
| 3 | **Reward Value, Not Activity** | Payout = Quality × Uniqueness × Difficulty × Verification × Usage |
| 4 | **Open Capability, Controlled Execution** | Supply is open; Agent Runtime · Permission · Commit · Payment stay Rimvio-owned |

## Flywheel

```text
                 실제 프로젝트 유입 (고객 수요)
                         ↓
                  빠른 Platform 생성 (Main Agent + Hub)
                         ↓
                    시장 투입 · 거래
                         ↓
                  경제적 가치 발생
                         ↓
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
   Developer          Contributor        Expert/Business
       ↓                 ↓                 ↓
   Capability          Reality Data       Domain Supply
       └─────────────────┼─────────────────┘
                         ↓
                  Verification / QA
                         ↓
              Capability Registry + Rimvio Index
                         ↓
                    Main Agent
                         ↺
```

## Project-first (not “build capabilities first”)

```text
Customer demand → "이런 플랫폼 필요" → Rimvio Project → Platform
```

Examples: delivery · travel · resale · local commerce · education · B2B ops.

Rimvio does **not** open with “developers please build capabilities.” Demand creates Projects; Projects consume Registry.

## Reuse Before Create pipeline

```text
Intent → Semantic Index → Existing Capability?
              /                    \
            YES                    NO
             │                      │
          REUSE (≥0.8)          CREATE (<0.5)
             │                      │
        IMPROVE (0.5–0.8)      Hub Agent Task
             │                      │
             └──────────┬───────────┘
                        ↓
                 Main Agent Execute
```

**Wire:** `lib/rimvio-index/reuse-gate.ts` · `lib/rimvio-index/improvement-task-pool.ts`

## Contributor roles

| Role | Supplies | Ledger kind |
|------|----------|-------------|
| Developer | Capability execution / upgrade | `capability_execution` · `capability_improvement` |
| User (supplier) | Reality Data capture | `data_submission` |
| Verifier | Trust / consensus | `human_verification` |
| Expert | Domain review | `expert_review` |
| Business | Inventory · price · policy · hours | `business_supply` |

Unified wallet: `lib/contributor-ledger/` (ADR-065).

## Reward formula v2

```text
payoutKrw = baseReward × quality × uniqueness × difficulty × verification × usage
```

| Factor | Source |
|--------|--------|
| quality | Contributor accuracy / reliability tier |
| uniqueness | Rare targetRef / low duplicate rate |
| difficulty | Task type tier (1–5) |
| verification | Consensus confidence (0–1) |
| usage | Capability execution count weight |

**Wire:** `lib/contributor-ledger/reward-formula-v2.ts`

Activity volume alone must **not** dominate ranking or payout.

## Revenue split (Rimvio take)

```text
Revenue → Contributor payout · Capability payout · Rimvio (platform fee · SaaS · execution fee)
```

Capability composite executions: 15% platform fee on split (`lib/capability-ledger/composition-split.ts`).

## Failed projects remain assets

```text
Project A (fail) → Payment · Order · Map · Notification Capabilities → Registry → Project B reuses
```

## Agent architecture alignment (4 pillars)

| Pillar | Main Agent | Hub Agent |
|--------|------------|-----------|
| Semantic Index | World/Capability search | Code/Domain search |
| Tool Loop | Goal-driven execute | Develop/verify Capability |
| Background Agent | Global orchestration | Platform ops loop |
| Multi-Agent | Hub orchestration | Worker swarm |

Phase order: **① Semantic Index + ② Dynamic Tool Loop** → ③ Background Hub → ④ Multi-Agent.

## Open vs controlled

| Open (ecosystem) | Controlled (Rimvio) |
|------------------|----------------------|
| Capability manifest | Agent Runtime (ADR-045) |
| Reality Data submit | Permission (ADR-047) |
| Verification response | Identity · Safety |
| Platform recipe | Payment · Trust · Execution policy |
| Knowledge extensions | Reality Commit (Article 0) |

## PR reject

- New Capability without Registry search (Reuse gate bypass)
- Create when similarity ≥ 0.8 without Improvement Task
- Payout by submission count only (no quality/uniqueness)
- Parallel payout store beside Contributor Ledger
- Business inventory as chat essay SSOT (Workspace Patch only)
- Auto Reality Commit from contributor consensus
