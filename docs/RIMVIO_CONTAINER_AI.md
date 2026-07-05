# Container AI — Operator Surface

**Status:** locked · chief architect · PR gate  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · `docs/RIMVIO_EXECUTION_GRAPH.md` · ADR `docs/adr/008-container-ai-operator.md`  
**Code SSOT:** `lib/container-ai/`

---

## One line

**Globe AI designs the container. Container AI operates it. The user sees one AI.**

---

## Stack (user vs developer)

### User sees

```text
🗾 Osaka Trip
🏨 Stay                    ← active Execution node (tap)
🤖 Trip Assistant          ← Container AI (single surface)
   [주변 호텔] [조용한 숙소] [비슷한 가격]
   _____________________  ← condition prompt
```

Product labels (L1): **Trip Assistant** · Journey AI · Trade Assistant — not internal module names.

### Developer sees

```text
L1 Globe AI (Architect)
  Intent · Blueprint · Container creation
        ↓
Container (EventCandidate / **bridgeId**) · runtime session (**runtimeId**)
        ↓
Container AI (Operator)     ← user-facing surface; orchestrates below
  ├── Travel Brain
  ├── Execution Graph Reader   ← always read active node first
  ├── Context Condition AI     ← internal name only
  ├── Domain AI Router
  ├── Ghost Pin Generator
  └── Action Composer
        ↓
L3 Domain AI (Execute)
        ↓
L4 Context Condition AI (React)   ← same module; invoked by Container AI
        ↓
L5 Commit (Reality)
```

**L2 Blueprint is pure data** — Container AI **reads** it; never mutates.

---

## Role definitions (locked)

| Role | Metaphor | Owns |
|------|----------|------|
| **Globe AI** | **Architect** | Intent · Container selection · Blueprint compose · initial dispatch |
| **Container AI** | **Operator** | Current container UX · route user message to internal modules · gate by Execution Graph |
| **Domain AI** | **Specialist Execute** | Lodging search · transit · trade · medical APIs · Ghost Pin prep |
| **Context Condition AI** | **React** (internal) | Distance · similar price · anchor condition · reactive pin batch |
| **Commit** | **Reality** | Book · pay · calendar · irreversible mutation after approval |

---

## Container AI always reads Execution Graph

Every user turn:

```text
readContainerAIContext(blueprint, activeNodeId)
  → Current Node (Stay)
  → Destination (Osaka · resolution)
  → Status (ready | blocked)
  → Available Capabilities (lodging · eatery · transit)
```

Then `gateContainerAIRequest(message)` → **allow route** or **block + suggest**.

### Example — wrong phase

User on **Prepare** says: *주변 호텔 찾아줘*

```text
Container AI (blocked):
  "현재는 Prepare 단계입니다. 먼저 목적지를 확정하면 숙소를 추천할 수 있습니다."
  [오사카] [도쿄] [후쿠오카]
```

No Domain AI call. No Ghost Pins. Hypothesis law enforced by **graph position**, not prompt.

### Example — Stay ready

User taps **🏨 Stay** · says *주변 호텔*

```text
Container AI
  → Execution Graph Reader: Stay · Osaka · ready · lodging
  → Domain AI Router → Lodging Domain AI
  → Ghost Pin Generator
```

User only talked to Trip Assistant.

### Example — budget condition

User: *비슷한 가격*

```text
Container AI → Travel Brain (budget slot) → Context Condition AI → pins
```

### Example — walk distance

User: *걸어서 5분*

```text
Container AI → Context Condition AI (distance filter) → pins
```

---

## UI contract (floating frame)

| Zone | Content | Source |
|------|---------|--------|
| **Header** | Container title · active node chip | EventCandidate + `activeNode` |
| **Summary (top)** | Stay · Osaka · budget · companions · check-in | Travel Brain slots + Blueprint temporal |
| **Quick actions** | 주변 호텔 · 조용한 숙소 · 비슷한 가격 · 지하철 가까운 곳 | Action Composer from `availableCapabilities` |
| **Prompt (bottom)** | Free condition text | Routes via `gateContainerAIRequest` |

**Code surface today:** `GlobeContextConditionPromptFrame` — migrate copy/eyebrow to Container AI / Trip Assistant; wire `readContainerAIContext` + gate on send.

---

## Internal module routing

| Module | When Container AI invokes |
|--------|---------------------------|
| `execution_graph_reader` | **Every turn** (mandatory) |
| `travel_brain` | Budget · taste · companion slots · personalization |
| `context_condition_ai` | Anchor + condition · distance · similar price filter |
| `domain_ai_router` | Lodging/eatery search when node + destination allow |
| `ghost_pin_generator` | After L3 prep · projection only until Commit |
| `action_composer` | Quick action chips · next-step CTAs |

---

## vs Globe AI (forbidden collapse)

| | Globe AI | Container AI |
|---|----------|--------------|
| When | No container · new Intent | Container exists · user inside trip/trade/medical |
| Creates Blueprint | ✓ | ✗ (read only) |
| Open composer `/search` | ✓ | ✗ |
| Execution Graph gate | compose | **read + enforce** |
| User label | (none — system) | Trip Assistant |

---

## Five layers preserved

Container AI is **not** a sixth layer. It is the **Operator surface** that:

- Reads **L2** Blueprint
- Dispatches **L3** Domain AI via router
- Invokes **L4** Context Condition AI for reactive conditions
- Surfaces **L5** approval gates — never auto-commits

Article 0 unchanged.

---

## PR gate

1. User-facing copy — Trip Assistant, not “Context Condition AI”
2. Every send path calls `readContainerAIContext` + `gateContainerAIRequest`
3. Blocked phase → no L3 domain search
4. Globe AI does not replace Container AI inside an active container
5. Ghost → solid only via Commit

---

## Code map

| Path | Role |
|------|------|
| `lib/container-ai/read-container-ai-context.ts` | Execution Graph Reader |
| `lib/container-ai/gate-container-ai-request.ts` | Phase gate + module route |
| `lib/globe/context-condition-ai/` | L4 react (internal) |
| `components/globe/globe-context-condition-prompt-frame.tsx` | Container AI UI shell (rename track) |
| `lib/context-blueprint/examples/travel-trip-execution-graph.ts` | Reference graph |

Tests: `npx tsx scripts/test-container-ai.ts`
