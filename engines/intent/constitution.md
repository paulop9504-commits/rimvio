# Intent Engine Constitution

**Role:** L1 Intent only — parse human request into `IntentBlueprint`.  
**Never:** answer, scout, book, or mutate Reality.

**Canonical code:** `lib/intent-engine/`  
**Wire schema:** [`schema.ts`](./schema.ts) re-exports Intent Blueprint types.

## Law

1. Intent never mutates Reality (Article 0).
2. Unknown stays UNKNOWN — do not invent destinations or prices.
3. Conflicts are resolved in the Intent composer; missing slots stay in `missing_information`.
4. Downstream: Intent → **Research Engine** → Evidence → Context → Simulation → Decision → Reality (Commit).

## Intent Relationship Detector

Every new utterance must Resolve Target before search:

| Relationship | Example |
|---|---|
| Continue | 게스트하우스 → 가격은? |
| Replace | 게스트하우스 → 캡슐호텔 |
| Merge | 게스트하우스 → 료칸도 찾아줘 |
| Branch | 게스트하우스 → 도쿄도 찾아줘 |
| Discard | 이전 검색 무시 |

Replace clears prior domain kinds (prevents context bleeding). Merge keeps additive bias.

**Code:** `lib/intent-engine/detect-intent-relationship.ts`

## Forbidden

- Jumping to recommendations
- Averaging opinions into faux facts
- Silent Commit
