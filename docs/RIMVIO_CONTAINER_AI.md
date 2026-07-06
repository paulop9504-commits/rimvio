# Container AI — Operator Surface

**Status:** locked · chief architect · PR gate  
**Related:** `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · `docs/RIMVIO_EXECUTION_GRAPH.md` · ADR `docs/adr/008-container-ai-operator.md`  
**Code SSOT:** `lib/container-ai/`

---

## One line

**Globe AI is the OS compiler — it designs how life flows. 맥락 AI is the OS runtime — it lives that flow in the real world.**

Product shorthand: **Globe AI designs the container. 맥락 AI operates it. The user sees one AI inside a container.**

---

## Globe AI vs 맥락 AI (locked product definition)

| | **Globe AI (L1 Architect)** | **맥락 AI (Execution Runtime)** |
|---|---|---|
| **Metaphor** | OS **Compiler** | OS **Runtime** |
| **Core role** | Designs **how life flows** for real-world action | **Executes** an already-built structure in reality |
| **Creates** | Structure (Graph · Blueprint · Container) | Map state · recommendations · replans |
| **Unit** | Whole trip / project | **Current moment** · active stage |
| **Time** | Future design | **Real-time** |
| **Output** | Execution Graph · Blueprint · policy constraints | Map · pins · actions |
| **Persona** | System architect | **Reality operator** — not a “thinking chatbot”, a **moving** engine |

### Globe AI — what it actually does

Not weak “Intent → structure”. It **compiles** intent into executable life flow:

```text
Intent
  → Execution Graph generation
  → Domain decomposition (travel · trade · schedule · …)
  → Stage design (Prepare → Move → Stay → Return · …)
  → Container + Runtime spawn
  → Policy / constraints (budget · time · risk · approval gates)
```

**Question it answers:** *How should this life flow be structured?* — not *what hotel should I pick?*

**Hard forbidden (system collapse if violated):** pin creation · search · recommendation · UI intervention · domain execution · Commit.

**Code:** `lib/context-run/` · `lib/context-blueprint/` · Globe ingress (`compileGlobeIngress`).

### 맥락 AI — what it actually does

**Not** “Operator + Condition + UI”. **Correct definition:**

> **맥락 AI = Execution Runtime + UI + Replanning Engine**

```text
Read Execution Graph → judge current stage
  → ask 1–2 condition questions if slots are thin
  → map placement (pins = results)
  → generate recommendations + reasons
  → real-time replan on refinement (“cheaper” · “quieter”)
```

**Question it answers:** *What do I do **right now** in this container?*

**Hard forbidden:** Blueprint creation · Container creation · whole-structure rewrite · auto-Commit.

**Internal modules** (developer-only names): Travel Brain · Execution Graph Reader · Context Condition AI · Domain AI Router · Ghost Pin Generator · Action Composer.

**Code:** `lib/container-ai/` · `lib/globe/context-agent/` · `lib/globe/context-condition-ai/` · `GlobeContextConditionPromptFrame`.

### Why this split is the product moat

Legacy AI: one model plans + executes + recommends in one blob.

Rimvio: **design and execution are separated** — same separation as OS compiler vs runtime.

```text
L1 Globe AI (Compiler)  →  designs flow
Runtime + Operator      →  lives flow   ← user-facing: 맥락 AI / Trip Assistant
L2 Blueprint            →  pure contract (data only — not “Context AI”)
```

**L2 Blueprint is not 맥락 AI.** Blueprint is immutable contract data; 맥락 AI **reads** L2 and **runs** against it.

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
| **Globe AI** | **Compiler / Architect** | Execution Graph · domain decomposition · stage design · Container spawn · policy constraints · initial dispatch |
| **맥락 AI** (Container AI / Trip Assistant) | **Runtime / Operator** | Execution Runtime + UI + Replanning · stage gate · condition questions · map placement · live refinement |
| **Domain AI** | **Specialist Execute** | Lodging search · transit · trade · medical APIs · Ghost Pin prep |
| **Context Condition AI** | **React** (internal) | Distance · similar price · anchor condition · reactive pin batch — invoked by 맥락 AI only |
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

| | Globe AI (Compiler) | 맥락 AI (Runtime) |
|---|----------|--------------|
| When | No container · new Intent | Container exists · user inside trip/trade/medical |
| Creates Blueprint / Graph | ✓ | ✗ (read only) |
| Creates pins / search / recommend | ✗ | ✓ (via internal modules) |
| Open composer `/search` | ✓ | ✗ |
| Execution Graph | compose skeleton | **read + enforce + replan** |
| User label | (none — system) | Trip Assistant · **맥락 어시스턴트** |

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
