# Globe Execution Surface — UX SSOT

> **Status:** 2026-06 — locked guardrails (implementation phased)  
> **Stack:** [CONTEXT_RUN_ENGINE.md](./CONTEXT_RUN_ENGINE.md) · [RIMVIO_CONSTITUTION.md](./RIMVIO_CONSTITUTION.md) · [GLOBE_FIELD_ROLE_SEPARATION.md](./GLOBE_FIELD_ROLE_SEPARATION.md)

## One line

Globe prompt is **not chat**. User states a **Goal**; **Execution Decision** picks the next **Surface** (card, sheet, map, Hub, Field ingress, …). Surfaces are **Projection** — never truth.

---

## Philosophy

| User | System |
|------|--------|
| Says **what** they want | Collects slots · asks only when needed · opens the right surface · runs work |
| Leaves **Facts** | **Commits** truth · **projects** execution state |

**Not chat:** no alternating User / Assistant threads. **Execution experience** — timeline cards are one surface type among many.

**Execution Feed** = timeline-style projection (cards, progress). **Execution Surface** = superset (map fly, Hub, Portal, Field Dashboard, pickers, approval, …).

---

## Architecture hook

```text
Goal → Context Run Engine → Question Engine → Execution Decision
  → Surface Resolver (deterministic) → Commit (when required) → Projection
```

**Surface Resolver** is code — not LLM. LLM may only phrase copy inside a surface the resolver already chose.

---

## Guardrails (non-negotiable)

### G1 — Surface ≠ Commit

Opening a sheet, flying the map, opening Field, or showing a card **does not** change truth.

| Allowed without Commit | Requires Commit first |
|------------------------|------------------------|
| Map fly, Hub peek, progress UI, empty wizard | Photo attached, price saved, listing publish, pay, handshake confirm |

**PR reject:** `commitEventUpsert` / `market_intent` write inside a surface component without passing through Decision → Commit pipeline.

---

### G2 — Single ingress, single brain

All inputs (composer, ➕ CaptureSheet, Portal tile, Share, automation) → **Context Run Engine** only.

| PR reject | Why |
|-----------|-----|
| Composer `ingest` + Portal + wizard as **parallel** decision paths | Double truth, double questions |
| Surface opens without `graphId` / RunState | Cannot reconstruct |
| `onTextCommitted` → Portal with no Decision | **Fixed** — `resolveGlobeComposerSurface`; plain text → `map_focus` only |

Wizard · Portal · Field Dashboard are **Projection surfaces** for a Run node — not second planners.

---

### G3 — One primary surface per turn

After each Decision, show **one** primary execution surface (+ optional subtle chrome).

| OK | Not OK |
|----|--------|
| Question card **or** media picker **or** map focus | Card + wizard + Field sheet + Hub at once |
| Dashboard **highlight** while Feed shows detail | Five modals stacked |

Apple 1–2 tap: secondary actions go to **Dashboard** or **Field ingress**, not more Globe chrome.

---

### G4 — Question Engine owns questions

Ask **only** when a **slot ID** is unfilled. Never ask the same slot twice in one graph reconstruction.

| Layer | Owns question |
|-------|----------------|
| Question Engine | **Which** slot |
| LLM | **How** it reads (copy) |
| Surface | **Where** input appears (inline, sheet, picker) |

**PR reject:** LLM or UI invents a new question not backed by an unfilled slot.

---

### G5 — Execution Decision before risky surfaces

**Code:** `decideRiskOperation` · `decideRunTurn` · `assertCommitPermitted`

| Risk | Decision | Surface (Resolver) |
|------|----------|-------------------|
| `publish_external` | `approval_required` | `approval_dialog` only |
| `payment` | `approval_required` | `approval_dialog` only |
| `handshake_confirm` | `approval_required` | `approval_dialog` only |
| unfilled slot | `ask` | `question_card` |
| match complete | `recommend` | `field_discovery_ingress` |

**PR reject:** `commitMarketIntentFromDraft({ publishExternal: true })` without `approvalGranted` or `autoEnvelope` · opening `portal` when Decision is `approval_required`.

---

### G6 — Globe vs Field boundary

| Surface family | Pillar |
|----------------|--------|
| Map focus, Hub, Portal, media, personal recall | **GLOBE** (1st person) |
| Listing browse, match, trades, handshake | **FIELD / DASHBOARD** (3rd person market) |

Field Dashboard opens only via `openFieldDashboardIngress({ tab, … })` with Decision-chosen args.

**PR reject:** Personal GPS 맛집/숙소 POI on Field discovery floor ([FIELD_DASHBOARD_INGRESS.md](./FIELD_DASHBOARD_INGRESS.md)). Trade handshake UI on Globe composer.

---

### G7 — Progress is ephemeral

Progress bars, “N명 분석 중”, waiting spinners are **Projection** — not durable RunState.

| Rule | |
|------|--|
| Complete → replace with **Result** surface or Dashboard row update | |
| Counts must be **real** (Field match) or honest copy — no fake precision | |
| Progress does not block reconstruct | |

---

### G8 — Reconstruct, not chat replay

Tomorrow’s re-entry:

| Do | Don’t |
|----|-------|
| RunState + Truth → Planner → current node → **one** primary surface | Restore full chat scroll |
| Dashboard % from **filled slots / nodes** | Saved “82%” blob as truth |
| Resume line: “어제 가격 단계에서 멈췄습니다” | Blank thread |

**Scale test:** *Can this execution be reconstructed tomorrow?*

---

### G9 — Projection never writes truth

Components under `components/globe/**`, `components/field/**`, surfaces:

| PR reject |
|-----------|
| Import `commitEventUpsert` / listing commit from UI without `lib/context-run/` (future) or approved commit adapter |
| `localStorage` fork that contradicts Event SSOT |
| Pin store update without event lineage |

Read: `life-read-model` / projections. Write: **Commit** only.

---

### G10 — LLM boundary (repeat)

LLM **must not** choose: goal, slot order, publish vs ask, which surface opens, Field vs Globe routing.

LLM **may**: parse user text into slot values; natural language on cards; explain a **committed** result.

**Test:** same Truth + RunState + code version → same Decision + same surface **kind** (copy may vary).

---

## Surface registry (deterministic examples)

| Trigger (Decision + slot / node) | Surface kind |
|----------------------------------|--------------|
| `slot:media` missing | Media picker · execution card |
| `slot:price` missing | Inline input · bottom sheet |
| `approval:publish` | Approval dialog |
| `node:match` running | Progress UI |
| `node:match` done | Recommendation card → Field discovery ingress |
| `node:lodging` done | Map focus · Hub preview |
| `multi_run` overview | Dashboard highlight (not Globe spam) |

Registry lives in code (`SurfaceResolver`) — extend this table when adding surfaces.

---

## PR checklist (copy into review)

1. **Ingress:** Does this path go through Context Run Engine?
2. **Surface:** Which `graphId` + node chose this UI?
3. **Commit:** Does any truth change? Through Commit only?
4. **Questions:** Which slot ID? Already filled in Truth?
5. **Boundary:** Globe or Field? Ingress SSOT correct?
6. **Chat:** Is this an Assistant thread? **Reject.**
7. **Reconstruct:** Tomorrow, same state from Truth?
8. **LLM:** Does behavior change if model is swapped?

---

## Anti-patterns (explicit reject)

```text
User → Assistant → User → Assistant   (ChatGPT shape)
Surface opens Portal on every text commit
Graph JSON persisted as second SSOT
Field place-search POI in discovery floor (Phase 3 F Field wiring)
Two question UIs for same slot (Feed + wizard)
```

---

## Related surfaces (reference)

Execution message · card · progress · bottom sheet · deep link · Hub · wizard · preview · product/listing card · map focus · dashboard highlight · approval · date/time pickers · inline button · Context Hub · Field Dashboard · Portal · media picker — all **Projection** kinds, not separate products.
