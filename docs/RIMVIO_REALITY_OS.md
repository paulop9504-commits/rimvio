# RIMVIO Reality OS — Core Experience (locked)

**Status:** locked 2026-08  
**Related:** ADR-022 · ADR-021 · ADR-018 · ADR-026 · `docs/RIMVIO_UX_CONSTITUTION.md`

## One sentence

> **Globe = 거시 현실 · Context = 프로젝트 · Workspace = 미시 작업장 · Entity = 실행 객체. Chat은 작업 로그만.**

Rimvio는 ChatGPT도 지도 앱도 아니다. 현실 Entity를 이해하고 Reality Project를 준비·실행하는 **Reality Operating System**이다.

---

## Four layers (do not collapse)

| Layer | Role | User sees |
|-------|------|-----------|
| **3D Globe** | 거시 현실 · Context 탐색 | 지구 · **Context Anchor** 카드/핀 |
| **Context** | 프로젝트 단위 (Osaka Trip) | 「오사카 여행」 |
| **Workspace** | Context의 미시 작업장 | 지도 + Peek + (로그) Chat |
| **Reality Entity** | 실행 객체 | 호텔 · USJ · 항공 카드 |

```
Globe (macro) = Reality Context browser
  └─ Context Anchor 「오사카 여행」  ← Capsule / Memory (NOT a hotel pin)
        progress · last act only
        └─ click → Workspace (micro IDE)
              └─ Entity들 → Peek → Prepare → Commit
```

**Globe ≠ Workspace.** Globe에서 Context를 고르고, 들어가면 Workspace에서 Entity를 만지고 실행한다.

### Context Anchor ≠ place pin

| Classic map | Rimvio Globe |
|-------------|--------------|
| 📍 호텔 = that hotel’s GPS | 📍 Osaka Trip = **project / Context** |
| Tap → place details | Tap → **Workspace Resume** |

Globe shows only Context chrome (title · progress · last act). Day plan · Entities · Actions live **inside Workspace**.  
Spatial attach for search/recommend uses the Context’s Anchor (see `docs/RIMVIO_CONTEXT_ANCHOR.md`) — still not “hotel icons as the product.”

**Forbidden in L1 copy:** 폴더 · 파일 · 📁 트리 as product nouns. Internal analogy (Cursor file / IDE) stays L3 only.

---

## Agent flow

```
User Prompt
  → Globe Agent / Intent Router
  → Context Creator
  → Workspace open (or Preview → 펼치기)
  → Reality Entity generation (coords · ontology · action · state)
  → Action Ready
  → Approval · Payment
  → Reality Commit
  → Context compression → Globe Memory
  → Continue Workspace
```

Chat output = **work log** (`✓ …`), never Reality SSOT.

---

## What lives where

| Surface | Owns | Never |
|---------|------|-------|
| **Globe** | Context Capsules · Forest after Commit · explore | Lodging/eatery **search pins** before Commit · live street editor |
| **Workspace** | Entity edit · Peek · Prepare · Approve · Pay · Day/Draft map | Bridge first-paint · photo-wall home · Field soft edits |
| **Entity Peek** | Media slots (few photos) · capability CTAs | Kind-fork Detail apps |
| **Chat** | Progress log · Brief | Inventory dump · Day essay SSOT |
| **Bridge** | People / share (post soft-offer) | Workspace Primary Focus |
| **Field** | Yes-one-answer FSM · hard Reserve/Purchase | Creating new resources |

---

## Entity lifecycle (universal)

```
Peek → Prepare → Approve → Payment → Commit
  discover | prepare | ready | approved | committed
```

Same for hotel · ticket · flight · eatery.

---

## PR reject

- Search lodging/eatery pins on 3D Globe before Reality Commit  
- Capsule resume → PinOpenSheet / Bridge media instead of Workspace  
- Chat essay or Day plan as SSOT over Reality Draft / Workspace nodes  
- Workspace first paint = Bridge collage or Instant Carry dense wall  
- L1 copy teaching 폴더/파일/📁 as product IA  
- Treating Globe as Workspace (or Workspace as Globe)

---

## Wire (code SSOT)

| Concern | Path |
|---------|------|
| Intent | `lib/intent-router/` |
| Trip / Reality Draft | `lib/context-workspace/prepare-trip-workspace-draft.ts` · `reality-draft/` |
| Capsule Resume | `lib/context-workspace/resume-capsule-workspace.ts` |
| Workspace shell | `components/context-workspace/context-workspace-shell.tsx` |
| Entity Peek / Action Ready | `workspace-node-peek.tsx` · `set-node-action-ready-state.ts` |
| Commit → Globe | `commit-workspace-to-globe.ts` |
| Lodging search → Workspace (not 3D pins) | `openLodgingContextWorkspace` · `syncAccommodationSearchPins` no-op · hub/discovery pipelines |
| Object / capabilities | ADR-018 · `lib/reality-object/` |
