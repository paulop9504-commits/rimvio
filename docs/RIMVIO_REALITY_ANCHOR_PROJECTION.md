# Rimvio Reality Anchor Projection

**Status:** locked 2026-08  
**Audience:** humans · LLM prompts · PR review  
**Parent:** [`RIMVIO_CONTEXT_WORKSPACE.md`](./RIMVIO_CONTEXT_WORKSPACE.md) · ADR [`022`](./adr/022-context-workspace-first.md) · Article 0  
**Wire:** `lib/context-workspace/` · `lib/context-run/` · MapLibre Workspace map (2D) · Globe Capsule after Commit

> **Map is not a search-results screen.**  
> Map is the **Projection Surface** of a Workspace Reality Draft.

---

## One sentence

> **Workspace = temporary Reality Graph for one Intent; Map / Callout / Sheet only project that graph; Commit alone changes Reality.**

---

## Core principle

| Wrong | Right |
|-------|--------|
| 검색 → 결과 리스트 → 선택 | Intent → Workspace → Reality Graph → Projection → 편집 → Commit |
| Chat essay = SSOT | **Workspace Patch = SSOT** |
| 지도가 검색한다 | 지도는 **Workspace를 렌더**한다 |
| 숙소 = 검색 hit | 숙소 = **Anchor에 연결된 Reality Object** |

---

## Runtime (locked order)

```text
Chat
  → Intent
  → Context Workspace
  → Reality Object Resolution
  → Object Enrichment
  → Workspace Patch
  → Projection (2D Workspace map · Callout · Sheet · Status)
  → (optional Capsule on Globe — Snapshot, not live street editor)
  → Action · Prepare
  → Reality Commit
```

Invert or skip Patch → Projection = **PR reject**.

---

## Example Intent — USJ near lodging

**User:** `유니버셜 스튜디오 근처 숙소 찾아줘`

### 1. Intent (not a chat answer)

| Field | Value |
|-------|--------|
| Goal | Find Accommodation |
| Anchor | Universal Studios Japan |
| Constraint | Nearby |

### 2. Workspace

Create / resume **one** Workspace for this Intent (e.g. `USJ Trip Context`). ADR-025 One Focus.

### 3. Reality Graph (objects inside Workspace)

```text
USJ Trip Workspace
  🎢 Universal Studios Japan   ← Anchor Object
  🏨 Hotels (candidates)
  🍜 Restaurants
  🎡 Activities
  🚆 Transport
```

USJ is **not** a list row. It is the **Anchor Object** — the criterion other objects relate to.

### 4. Anchor enrichment

Anchor carries living Reality properties (facts, not essays):

- Location · images · experience media  
- Hours · tips · reviews (when available)  
- Nearby / travel-time edges  

### 5. Workspace Patch (SSOT)

AI does **not** dump a hotel list in chat first.

```text
Workspace Patch
  + USJ Anchor
  + Nearby Hotel Candidates
  + Relations (distance · reason · price)
  (+ optional Restaurants / Activities)
```

Refine (`더 싼 숙소로 바꿔`) = **constraint → Patch replace**, not a fresh parallel search UI.

### 6. Projection

2D Context Workspace map shows **only** what the Patch put in the graph:

```text
        🏨 Hotel A

  🎢 Universal Studios  ← Anchor
     (experience / brief)

     🍜 · 🎡 …
```

- No inventory wall of unrelated search hits  
- Soft zone / Decision float / spokes = **Diff of the same Patch facts**  
- Metro / transit overlays = optional Context aid on Workspace map only (not 3D Globe)

### 7. Callout = Object Workspace View

Pin / Callout tap **expands the Workspace Object** — does not start a new web search.

```text
Universal Studios Japan
  Experience · AI Brief · Context role (“숙소 기준점”)
  Actions: 주변 숙소 · 일정 · 동선 …
```

### 8. Connected lodging

```text
USJ ──connected_to── Hotel A
  distance · price · reason (e.g. morning entry)
```

Hotel is a **related Reality Object**, not an orphan search card.

### 9. Status (work state, not transcript)

```text
✓ USJ 분석 완료
✓ 주변 숙소 N개 추가
✓ 이동 시간 계산
✓ Projection 갱신
```

One-line Agent Status · never Patch essay SSOT.

### 10. Commit

Prepare only until user Reality Commit (Article 0).  
After Commit → Capsule / Forest densify — Globe is **not** the live Context editor.

---

## Surface roles (reminder)

| Surface | Role |
|---------|------|
| Chat | Intent entry · 1-line status |
| Context Workspace (2D map) | Live Projection of Draft Graph |
| Callout / Decision float | Object Diff · Evidence |
| Bottom Sheet | Same facts · Action / Prepare |
| Globe | Capsule / Forest after Snapshot · Commit — **not** search pins before Commit |

---

## PR reject

- Search result list as product SSOT (chat or map)  
- Lodging/eatery **search pins on 3D Globe** before Commit  
- Callout that invents facts not in Workspace Patch  
- “다시 검색” UI that bypasses Workspace constraint refine  
- Treating Workspace as a static itinerary document instead of a **mutable Reality Draft**

---

## Final definition

Workspace is **not** a trip planner checklist.

> **Workspace = the temporary workshop where AI assembles Reality Objects and relations for one Intent.**

Globe projects that work. Callout shows Object Diff. Only Commit changes Reality.
