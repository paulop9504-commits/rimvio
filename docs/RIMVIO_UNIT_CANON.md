# Rimvio Unit Canon

**Status:** locked 2026-08  
**ADR:** `docs/adr/047-unit-canon.md`  
**Code SSOT:** `lib/unit-canon/`  
**Wire (money):** `lib/globe/context-hub/format-lodging-nightly-price.ts` (re-exports)

> 숫자를 저장하지 말고, **단위와 맥락이 붙은 값**을 저장한다.  
> UI는 단위를 바꾸고, **Commit만 총액**을 쓴다.

## Value shape

모든 측정값:

```text
{ value, unit, context, surface }
```

| Field | Meaning |
|-------|---------|
| `value` | number / code |
| `unit` | locked unit (KRW/night, m, ★5, …) |
| `context` | stay · guests · rooms · source |
| `surface` | `display` \| `prepare` \| `commit` |

## Time

| Rule | Canon |
|------|-------|
| Store | ISO-8601 + IANA timezone |
| Stay | `checkIn` / `checkOut` → `nights = max(1, round(out − in))` |
| Day boundary | trip timezone local midnight |
| UI labels | locale format only — do not rewrite the stored instant |

## Money

| Surface | Lodging price |
|---------|----------------|
| **display** (card · chip · Compare callout) | **nightly KRW** + `/ 1박` |
| **prepare / commit** | **stay total** (`totalPriceKrw`) |

Always keep: `amount` + `currency (ISO-4217)` + `basis (nightly \| total)` + `taxesIncluded?`.  
Never show a bare number without basis.

Default currency: **KRW**.

## Party

- `adults` / `children` / `infants` = explicit counts  
- `rooms` = `roomCount`  
- Offer identity includes **guests + rooms + stay**

## Space

| Store | UI |
|-------|-----|
| WGS84 lat/lng | map pins |
| distance **meters** | walk **minutes** (`WALK_METERS_PER_MINUTE`) |
| near radius | explicit meters (product constant) |

Do not mix km labels with meter math in the same chip.

## Rating

- Store: **0–5** float when source is 5-star  
- UI: `★ x.x`  
- Never mix 5-star and 100-score in one chip  
- `reviewCount` required for social-proof lines  

## Match / Decision

- Match %: **0–100** integer  
- Decision weights **sum to 1.0**  
- Axes labeled (`location` · `scheduleFit` · `price` · …)  
- Score without context weights = invalid  

## Place identity

- IDs provider-prefixed: `liteapi:` · `maps:` · …  
- Merge only on strong identity  
- Title: KO preferred, source fallback  

## Lifecycle (Article 0)

```text
draft → prepare → ready → commit
```

AI prepares · Humans approve · Reality commits.  
Display/select never auto-commits.

## Compare

- Callout price: **nightly only**  
- Edge label unit: **walk minutes**  
- Candidate cap: product constant  

## Content

- Images: hero first, gallery capped  
- Why lines: no duplicate price/rating facts  
- User copy: L1 from `lib/copy/human-ko.ts`  

## PR reject

- Lodging card showing stay total labeled as `/ 1박`  
- Bare KRW without `basis`  
- Mixing ★5 and Match% scales in one label  
- Auto Reality Commit from price tap  
- New money/date helpers that bypass `lib/unit-canon/`
