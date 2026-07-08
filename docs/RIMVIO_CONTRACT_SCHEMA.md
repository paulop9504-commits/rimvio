# Rimvio Contract Schema

**Scope (B):** Scout contracts are runtime. Commit field names are locked stubs. **`Capital.Settlement` is Phase 2 only** — not owned by Globe / 맥락 AI.

Canonical pipeline: **툭 던짐 → 계약 → 준비 완료**.

Related: [`RIMVIO_CONTAINER_AI.md`](./RIMVIO_CONTAINER_AI.md) · [`RIMVIO_CONTEXT_OS_ARCHITECTURE.md`](./RIMVIO_CONTEXT_OS_ARCHITECTURE.md) · Code: `lib/globe/contracts/`

---

## 1. Pattern overview

| Pattern | `contract_type` | Core fields | SSOT | Human action |
|---------|-----------------|-------------|------|--------------|
| Scout | `scout` | `category`, `lens`, `sort_by`, `count` | New batch (`batchId` ≡ `scout_id`) | Pick candidate |
| Inventory filter | `filter_inventory` | kind chip / NL narrow cue | Open Discovery reel only | Narrow existing list |
| Commit (L5 stub) | `commit` | `candidate_ref`, `reservation`, `ledger_entry_ref` | Prior scout output | Approve only |
| Schedule | `schedule` | `participants[]`, `calendar_ref`, `constraint` | Calendar SSOT | Slot pick |
| Archive | `archive` | `experience_ref`, `tags[]`, `ontology_bind` | Past commit / truth | Tag confirm |
| Capital settlement | `Capital.Settlement` | see §5 | Capital OS · Phase 2 | Signer approve |
| Mixed | `scout` × N | per-category clone + `anchor_ref` | Independent then chained | Per-cohort pick |

**Runtime this sprint:** `scout` + `filter_inventory` gate. Others = document lock only.

---

## 2. Code symbol map (scout)

| Schema | Code |
|--------|------|
| `contract_type: "scout"` | `ScoutContract` in `lib/globe/contracts/scout-contract.ts` |
| `category` | maps ↔ `LocalDiscoveryActionSpec.resourceTypes[0]` |
| `lens.radius_m` | `DiscoveryLens.radiusM` / spec `radiusM` |
| `lens.anchor_ref` | `ScoutContract.lens.anchorRef` |
| `scout_id` / output | `ContextConditionLastBatchWire.batchId` (**same id — no dual keys**) |
| Spec payload | `LocalDiscoveryActionSpec` (no rename) via adapter |

`filter_inventory`: NL parser [`parseResourceReelKindFilter`](../lib/globe/resource-reel/parse-resource-reel-kind-filter.ts) — bare domain words (**맛집**) are **scout**, not filter.

---

## 3. Mixed scout + `anchor_ref`

```text
"이번 주말 여자친구랑 뭐하지, 맛집이랑 그 근처 놀거리까지"
  → scout_1 category=restaurant (independent lens)
  → user selects place_A
  → scout_2 category=activity, lens.anchor_ref = scout_1 selected candidate
```

Violation if `scout_2` runs without resolvable `anchor_ref` while declared as a chained follow-up — separate neighborhoods = route tangling.

---

## 4. Commit stub (names locked — no runtime ledger)

Field groups reserved for L5 / prep later:

| Group | Fields |
|-------|--------|
| Link | `candidate_ref` (required; null ⇒ commit invalid) |
| Reservation | `slot{date,time,duration}`, `party_size`, `provider` (inherit from candidate — no retype), `status` read-only enum, `cancel_policy_ref` |
| Ledger stub | `ledger_entry_ref`, `amount{value,currency}`, `amount_type`, `ledger_status` (commit time always conceptually `queued`) |

**Removed from commit:** `auth_status`, `method_ref`, `receipt_ref` — payment finality is **not** live PG; see Capital.Settlement.

**Do not implement** write paths / PG / ledger append in Globe scout work.

Personal “commit” in UX = **승인** on prepared execution (Blueprint `approvalPolicy` / waiting_approval). Distinct from Capital.Settlement.

---

## 5. Capital.Settlement (Phase 2 — not Globe)

**Namespace:** `Capital.Settlement`  
**Owner:** Capital OS / Field·Market settlement plane — **not** Globe 맥락 AI / Context Condition.

Do **not** collide with Platform OS `settlementStatus: PENDING|SETTLED|…` on CausalProof. Use prefixed types / docs (`Capital.Settlement`, `capitalSettlement`) when Phase 2 lands.

| Field | Role |
|-------|------|
| `ledger_refs[]` | Bundle of queued ledger entries from commits |
| `total_amount` | Sum only — no hand edit |
| `period` | Settlement window |
| `document_ref` | Signable document |
| `signer_ref` | Approver (merchant / owner) |
| `signature_status` | `pending` → `signed` \| `rejected` — **only** payment-final trigger |
| `signed_at` | Set when signed |

State: commit success → ledger `queued` → Capital.Settlement bundle → signer → `signed` → ledger entries `settled`.

**This repo sprint:** document only. No UI, no signature, no ledger writes.

---

## 6. Violation rules

| Violation | Example | This sprint |
|-----------|---------|-------------|
| Category contamination | scout(restaurant) emits activity | **Code** `assertScoutContract` |
| Lens dual-origin | chained scout missing / dangling `anchor_ref` | **Code** |
| SSOT fork | reel rebuilt from trip inventory / wrong source id | **Code** (reel = batch \| lens only) |
| Order violation | commit before scout | Doc (commit not runtime) |
| Price mismatch | scout estimate vs ledger amount | Doc / Capital+commit later |
| Settlement without signature | settled while signature pending | Doc / Capital Phase 2 |
| Total mismatch | `total_amount` ≠ sum(refs) | Doc / Capital Phase 2 |

---

## 7. Discovery reel SSOT (enforced)

Order:

1. Active lens prefetch `ready` with items  
2. Else last scout batch recommendations (`batchId`)  
3. Else **empty** — **never** fall back to trip lodging/eatery inventory on Discovery reel

---

## 8. Non-goals (this sprint)

- Capital.Settlement runtime  
- Commit / ledger / PG execution  
- `schedule` / `archive` contract runners  
- ReAct agent loop  
- Renaming `LocalDiscoveryActionSpec`

## Related

Operator turn gate (SSOT + whitelist tools): [`RIMVIO_OPERATOR_TURN.md`](./RIMVIO_OPERATOR_TURN.md)
