# `lib/capital/` — reserved (prep only)

**Do not implement Capital OS features here until explicitly scheduled.**

## Why this folder exists

Future **AI CFO** work (life plan horizons, financial facts, macro projection, fusion) gets a dedicated namespace so it never collides with:

| Existing | Means |
|----------|--------|
| `lib/globe/market/` | Field Market — neighbor listings & trades |
| `lib/markets/` | Travel/commerce intent probes |

## Rules (now)

1. **No production imports** from `lib/capital/` until C0 ships.
2. **SSOT** when built: extend `EventCandidate` + `commitEventUpsert` — no parallel finance event store.
3. **Multi-horizon goals** extend `lib/plan-context/` — do not fork a second plan system.
4. **Macro** = read projection only; never truth writes.

## Spec

`docs/RIMVIO_CAPITAL_OS.md`
