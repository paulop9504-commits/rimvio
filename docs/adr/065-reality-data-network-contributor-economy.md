# ADR-065: Reality Data Network + Contributor Economy

**Status:** accepted 2026-08  
**Wire:** `lib/reality-data-network/` · `lib/contributor-ledger/` · `lib/capability-ledger/`  
**Related:** ADR-040 · ADR-037 · ADR-049 · ADR-051 · ADR-063

## One sentence

> **User-submitted Reality Data flows AI pre-label → Task Pool → human consensus → Verified Reality (Confirmed epistemic) — contributors earn through a unified Contributor Ledger alongside Capability Execution payouts.**

## Context

Rimvio Agents consume lodging photos, POI facts, and attributes. Vendor APIs and user captures coexist; **photo confidence** and **epistemic level** must gate Agent trust.

Traditional labeling: enterprise → worker → label → enterprise.

Rimvio path:

```text
Real-world user → submit → AI pre-label (Suggested) → human verify → Confirmed Reality → Agent/Capability
```

Contributors include: Reality submitters, Verifiers, Capability developers (ADR-063 ledger).

## Epistemic rules (ADR-040)

| Level | Meaning | Agent use |
|-------|---------|-----------|
| **Suggested** | AI pre-label only | Do not rank/book as Confirmed |
| **Inferred** | AI + weak signal | Soft weight only |
| **Observed** | User submitted, unverified | Task Pool pending |
| **Confirmed** | Consensus + policy | High-trust Agent input |

**Consensus ≠ Reality Commit.** Verified data enters Workspace as Confirmed facts; **booking/payment still requires Human Commit** (Article 0).

## Payout rules

```text
payoutKrw = baseReward × qualityMultiplier × difficultyFactor
```

| Role | Entry kind | Example |
|------|------------|---------|
| Supplier | `data_submission` | Photo submit ₩10 |
| Verifier | `human_verification` | YES/NO consensus ₩10–300 |
| Capability dev | `capability_execution` | hotel.lookup ₩10 (capability-ledger) |

Quality multiplier: accuracy rollup (99%+ → 1.5×, &lt;80% → 0.5×).

Capability Execution Ledger (`lib/capability-ledger/`) and Reality Task payouts merge in **Contributor Ledger** (`lib/contributor-ledger/`) — one wallet per contributor.

## Task Pool

- Types: `photo_authenticity`, `room_type_label`, `attribute_verify`, `complex_verification`, `expert_review`
- Consensus: 3-of-N verifiers, threshold 0.67
- Dispute: split vote → `disputed` status, expert_review escalation

## Agent integration (R7)

When `verifyLodgingCandidate` fails with `photo_confidence` or low `LodgingPhotoConfidence`, Agent may **spawn** `photo_authenticity` task — not auto-commit, not parallel result store.

## PR reject

- Consensus auto Reality Commit
- Verified data bypassing Workspace Patch
- Parallel contributor payout store beside Contributor Ledger
- Agent using Confirmed labels without consensus gate
