# Rimvio Portal UI Spec v1

> **Status:** canonical 2026-06  
> **Layer:** L2 Product · L3: `lib/portal/*`, `components/portal/*`  
> **Related:** `docs/RIMVIO_GLOBE_ARCHITECTURE.md` · `docs/GLOBE_HUB_RESOURCE.md`  
> **L1 copy:** `lib/copy/human-ko.ts` (`copy.portal.*`) — never 「Portal」「Hub」 in hero UI

---

## Core principle

Portal is **not** a service catalog. It is the **Intent → Projection → Action** layer that connects lived context to the external world.

Portal does **not** store context. Portal **projects** existing `eventId` outward.

---

## Stack

```
Internal Globe (SSOT)
  → Context Bridge
  → Hub (resource plug-in — 맞춤 · 항공 · 숙소)
  → Portal (intent execution)
  → External Globe (discovery)
```

---

## Portal home (L1)

First screen is always **macro intent**, never service category:

| Intent | L1 |
|--------|-----|
| offer | 내놓기 |
| seek | 구하기 |
| together | 함께하기 |
| join | 참여하기 |

## Level 2 — category (after intent)

Categories depend on intent. v1 **live:** `used_goods` → market Portal projection. Others: phased stub.

## Level 3 — projection

Context analysis + auto-fill + auto-matching preview → **외부 공개** gate.

---

## Visual hierarchy

```
Intent (largest)
  → Category
    → Details / preview
```

Feel: Action Center · Mission Control · Launch Pad — **not** marketplace, settings, or bulletin board.

---

## Absolute rules

**Forbidden**

- Service list on Portal home (중고 · 채용 · 부동산 as top level)
- Marketplace / listing-app layout
- Category before intent
- Creating `EventCandidate` on External Globe

**Required**

- Intent-first navigation
- Context-based auto-fill
- Auto-matching before heavy form input
- Explicit **외부 공개** before `market_intents` write

---

## Code map

| Item | Path |
|------|------|
| Intent registry | `lib/portal/portal-intent-registry.ts` |
| Open bridge | `lib/portal/globe-portal-open-bridge.ts` |
| Portal sheet | `components/portal/rimvio-portal-sheet.tsx` |
| Market projection | `components/globe/globe-market-intent-wizard-sheet.tsx` |
