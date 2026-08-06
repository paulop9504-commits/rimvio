# ADR-047: Unit Canon (date · money · space · score)

**Status:** accepted 2026-08  
**Wire:** `lib/unit-canon/` · `docs/RIMVIO_UNIT_CANON.md`  
**Related:** ADR-005 (Article 0) · ADR-022 · lodging nightly display (`format-lodging-nightly-price`)

## One sentence

> **Every measured value carries unit + context + surface; lodging UI is nightly, Prepare/Commit is stay total.**

## Why

Bare numbers (`120000`, `3`, `4.2`) caused hotel cards to show stay totals as `/ 1박`, mixed rating scales, and ambiguous walk distances. Google-style products keep **rate basis + stay window + currency** on the price object — Rimvio locks the same pattern as Unit Canon.

## Decision

| Axis | Display | Prepare/Commit |
|------|---------|----------------|
| Lodging money | nightly KRW | `totalPriceKrw` |
| Stay length | derived `nights` from check-in/out | same |
| Distance | walk minutes | meters in graph |
| Match | 0–100 | same |
| Rating | ★ 0–5 | same |

## Consequences

- New formatters live under `lib/unit-canon/` (or re-export from it).  
- Cursor rule `rimvio-unit-canon.mdc` rejects PR bypass.  
- Legacy string `amountLabel` may still need display-time strip of `/박`; new writes use nightly labels.

## Out of scope (follow-ups)

- Provider tax-inclusion parity  
- Bulk migration of historical `amountLabel` rows  
- Multi-currency FX timestamp policy beyond ISO-4217 tag
