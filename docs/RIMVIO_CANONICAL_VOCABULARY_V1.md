# Rimvio Canonical Vocabulary v1

> **Superseded by** `docs/RIMVIO_CANONICAL_VOCABULARY_V2.md` (2026-07-06)

**Status:** archive · do not extend  
**Date:** 2026-07-06  
**Goal:** **하나의 용어 = 하나의 책임** (one term, one responsibility)  
**Related:** `docs/RIMVIO_BRIDGE_VS_CONTAINER.md` · `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` · `docs/RIMVIO_CONTAINER_AI.md`

---

## Executive summary

| Verdict | Detail |
|---------|--------|
| **Core OS model** | Sound — Bridge (File) · Container (Process) · Blueprint · ExecutionGraph · Commit maps cleanly to OS |
| **Main risk** | **Context** and **Container** are overloaded in legacy code — not in the new Context OS wire |
| **Bridge vs Context** | **Different responsibilities** — Bridge = stable memory identity; Context (L1) = UX umbrella · **not a separate SSOT type** |
| **Keep Bridge?** | **Yes** — Bridge is not “a collection of contexts”; it **is** the committed memory identity (`EventCandidate` / `bridgeId`) |
| **Rename policy** | Prefer **narrowing** + **qualified names** over new terms; rename **legacy-only** symbols where they collide |

---

## 1. Current code meaning (audit)

### Context

| Meaning in repo | Layer | Code / doc |
|-----------------|-------|------------|
| User-facing globe bundle (“민수랑 제주 Day2”) | L1 / L2 | `docs/RIMVIO_STORY_LAYER.md` |
| **Same object as experience node** | L3 | `EventCandidate` · `contextEventId` · `createManualGlobeContext` |
| Hub scope (ticket · lodging inside one pin) | L2 product | `docs/GLOBE_HUB_RESOURCE.md` |
| **Context Run** — composer/capture ingress pipeline | L3 execution path | `lib/context-run/*` · `dispatchContextRun` |
| **Personal Context AI** — recall ask | L4 surface | `lib/personal-context-ask/` |
| **Global Brain context block** — LLM prompt assembly | infra | `lib/global-brain/*` |
| Legacy **goal/chat bucket** | legacy | `lib/container-store/` · `lib/containers/context-containers.ts` |
| Generic field name | everywhere | `contextEventId`, `buildContextInstance`, … |

**Ambiguity count: ≥6.** “Context” is an **umbrella word**, not one object.

---

### Bridge

| Meaning in repo | Layer | Code / doc |
|-----------------|-------|------------|
| **Memory identity** (Who/Where/When/What, committed) | L3 truth | `EventCandidate` · `bridgeId` · `docs/RIMVIO_BRIDGE_VS_CONTAINER.md` |
| **Experience Bridge** — multi-user shared globe protocol | L3 social | `docs/RFC_EXPERIENCE_BRIDGE.md` · `lib/experience-bridge/` |
| Public opportunity unit (밖 지구) | L2 external | `docs/RIMVIO_EXTERNAL_GLOBE_AI.md` |
| Story/recall unit | L1/L2 | `docs/RIMVIO_PERSONAL_CONTEXT_AI.md` “Bridge cards” |

**Ambiguity count: 3** — qualified by **Bridge (memory)** vs **Experience Bridge (protocol)**.

---

### Container

| Meaning in repo | Layer | Code / doc |
|-----------------|-------|------------|
| **Runtime session (Process)** — NEW canonical | L2/L3 OS | `ContainerRuntime` · `runtimeId` · `ContextBlueprint` |
| Blueprint vertical kind | L2 | `containerKind: travel \| trade \| …` |
| **Container AI** operator surface | L1 product | `lib/container-ai/` · prompt frame |
| Legacy **goal bucket + knowledge json** | legacy | `lib/container-store/types.ts` `ContainerRecord` |
| Legacy **chat persona presets** | legacy | `lib/containers/container-types.ts` `bitcoin_trader` |
| **Dock UI route** | UI projection | `lib/container-rework/` `ContainerRoute` |
| **Lodging RAG bundle** (misnamed) | L3 impl detail | `LodgingAgentContainer` |
| Cloud DB `containers` table | legacy cloud | `docs/RIMVIO_SYSTEM_AUDIT.md` |
| Hub “functional container” | L2 metaphor | `GLOBE_HUB_RESOURCE.md` (pipeline inside Context) |
| `EventCandidate.containerId` | legacy link | → legacy `ContainerRecord.id` |

**Ambiguity count: ≥8** — **highest collision risk** in codebase.

---

### Blueprint

| Meaning | Layer | Code |
|---------|-------|------|
| Immutable process specification before execution | L2 | `ContextBlueprint` · `lib/context-blueprint/types.ts` |
| Sub-contracts: executionGraph, spatialTargets, … | L2 | v6 wire |

**Ambiguity count: 1** (clean in new stack).  
Note: “Blueprint v3/v5/v6” = contract version, not second concept.

---

### Execution Graph

| Meaning | Layer | Code |
|---------|-------|------|
| Ordered execution nodes (Prepare → Stay → …) | L2 on Container | `ExecutionGraph` · `execution-graph.ts` |
| **Execution Space** / spatial execution graph | L2 travel MVP | `ExecutionSpace` · `spatial-plan.ts` |

**Ambiguity count: 2** — **Execution Graph** (phase/task) vs **Execution Space** (map projection). Keep both; always qualify.

---

### Globe AI

| Meaning | Layer | Code |
|---------|-------|------|
| L1 Architect — Intent · Bridge/Container spawn · Blueprint compose | architecture | `docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md` |
| Actual ingress (split today) | L3 paths | `planContextRun` · `experience-run` · composer · `ensureTripContextEvent` |

**Ambiguity count: 2** — **role is clear**; **implementation is not one module** (documented gap).

---

### Container AI

| Meaning | Layer | Code |
|---------|-------|------|
| User-visible Operator inside active Container | product / orchestration | `docs/RIMVIO_CONTAINER_AI.md` |
| UI shell today | surface | `GlobeContextConditionPromptFrame` |
| Internal modules | orchestration | Travel Brain · graph reader · Condition · Domain router |

**Ambiguity count: 1** if **Context Condition AI** stays internal-only.

---

### Domain AI

| Meaning | Layer | Code |
|---------|-------|------|
| L3 specialist executor umbrella | architecture | `DomainExecutorId` · lodging-agent · discovery pipelines |
| Single agent instance | L3 | `runLodgingAgentTurn` |

**Ambiguity count: 1** (role vs instance — acceptable).

---

### Context Condition AI

| Meaning | Layer | Code |
|---------|-------|------|
| L4 reactive condition → pins (internal module) | L4 | `lib/globe/context-condition-ai/` |
| Invoked by Container AI | orchestration | pin bar · anchor classify |

**Ambiguity count: 1** — **must not appear in L1 UI copy**.

---

### Commit

| Meaning | Layer | Code |
|---------|-------|------|
| L5 reality mutation after human approval | architecture | `docs/RIMVIO_CONSTITUTION.md` Article 0 |
| EventCandidate truth write | L3/L5 | `commitEventUpsert` · `lib/source-of-truth/commit-truth.ts` |
| Context Run commit gate | execution path | `lib/context-run/commit-gate.ts` |

**Ambiguity count: 2** — same **law**, multiple entrypoints (acceptable if all gate L5 rules).

---

## 2. Term conflict table & recommendations

| Current name | Problem | Recommended handling | Why | Affected code (priority) |
|--------------|---------|----------------------|-----|---------------------------|
| **Context** (as SSOT type) | = EventCandidate · Run · Hub · legacy bucket · prompt block | **L1 UX word only**; code uses **Bridge** / `EventCandidate` | One storage object, one name | New: `bridgeId`; gradual: stop new `contextEventId` APIs |
| **Context** vs **Bridge** | Story L2 “Context” = L3 EventCandidate = Bridge | **Keep both**: Context (L1) · Bridge (L3 identity) | Users say 맥락; engineers say Bridge/File | Docs only — no merge |
| **Container** (OS) | Collides with 7+ legacy uses | **Qualified: `ContainerRuntime` / `runtimeId`** in all OS docs & new code | Process vs bucket vs RAG bundle | `lib/container-runtime/*`, Blueprint v6 |
| **ContainerRecord** | Legacy goal/chat bucket | **Legacy: `GoalBucket`** (rename when touched) | Not OS Process | `lib/container-store/` |
| **ContainerRoute** | Dock UI only | **Legacy: `DockRoute`** (rename when touched) | Not runtime | `lib/container-rework/` |
| **LodgingAgentContainer** | RAG scope, not OS Container | **Rename: `LodgingAgentScope`** (when touched) | Avoid “Container” for non-Process | `lib/globe/lodging-agent/` |
| **Experience Bridge** | Shares “Bridge” | **Always qualified: Experience Bridge** | Social protocol ≠ memory File | `lib/experience-bridge/` |
| **Execution Space** | vs Execution Graph | **Keep both** — Space = map/WHERE MVP; Graph = phase/WHAT next | Travel map projection | `spatial-plan.ts` |
| **Context Run** | Overlaps Globe AI + Container spawn | **Keep name**; document as **ingress router** migrating → Globe AI + ContainerRuntime | Already shipped | `lib/context-run/` |
| **Global Brain** | Not in OS stack; sounds like “the AI” | **Keep** as **prompt assembler** only; never user-facing | Orthogonal infra | `lib/global-brain/` |
| **Context Condition AI** | User-facing in old copy | **Internal module only**; UI = **Container AI** / Trip Assistant | Operator surface unity | `context-condition-ai/`, `human-ko.ts` |
| **ownerContext** (Blueprint) | Meant event id; now runtime | **Deprecated** → `runtimeId` + `bridgeId` | File vs Process ids | `lib/context-blueprint/types.ts` |
| **EventCandidate.containerId** | Points to legacy bucket | **Deprecated** — do not use in Context OS paths | Wrong parent model | grep `containerId` on events |
| **Hub “container”** | Metaphor for pipeline host | **Doc only: “Hub host”** — avoid Container in new Hub PRs | Hub lives *on* Bridge | `GLOBE_HUB_RESOURCE.md` |

**No term removed from v1** except recommending **qualified** legacy renames when files are touched — not big-bang rename.

---

## 3. Vertical scalability (Travel → Smart Home)

| Term | Travel | Trade | Medical | Workspace | Education | Smart Home |
|------|--------|-------|---------|-----------|-----------|------------|
| **Bridge** | trip memory | listing/seller memory | care episode | project/workspace file | course/term memory | home/room identity |
| **Container** | trip-runtime | deal-runtime | visit-runtime | sprint-runtime | semester-runtime | automation-runtime |
| **containerKind** | `travel` ✓ | `trade` ✓ | `medical` ✓ | `work` ✓ | `education` ✓ | `smart_home` ✓ |
| **Execution Graph** | Prepare→Stay→Return | Listing→Meet→Pay | Prepare→Visit→Rx | Plan→Execute→Review | Enroll→Learn→Exam | Trigger→Act→Confirm |
| **Container AI label** | Trip Assistant | Trade Assistant | Care Assistant | Work Assistant | (add) | (add) |
| **Domain AI** | lodging · transit | trade · finance | medical | work · schedule | education | smart_home |

**Verdict:** Vocabulary **scales** if **Container** always means **ContainerRuntime (Process)** in new code and legacy “container” is qualified or renamed.

---

## 4. OS analogy evaluation

| Rimvio | OS | Fit | Caveat |
|--------|-----|-----|--------|
| **Bridge** | File | **Strong** | Immutable truth; identity; no execution plan |
| **Container** | Process | **Strong** | spawn/complete; mutable state; 1 Bridge → N runtimes |
| **Blueprint** | Process spec / manifest | **Strong** | Immutable **revision** per compose (like pinned spec snapshot) |
| **Execution Graph** | Scheduler + task DAG | **Good** | Also carries **node status** (not just ordering) |
| **Commit** | System call | **Good** | **Gated** syscall — requires approval policy (stricter than Unix) |

**Overall:** OS mapping is **natural and defensible** for long-term Context OS positioning.

---

## 5. Bridge vs Context — objective analysis

### Are they different objects?

| | **Bridge** | **Context** (when = experience unit) |
|---|------------|----------------------------------------|
| SSOT type | `EventCandidate` / `bridgeId` | **Same row in store today** |
| Responsibility | Memory · Truth · Identity | **Story/UX label** for that memory |
| ExecutionGraph | **Forbidden** | N/A (must not hold graph) |
| User says | “그때 거기” · 경험 | **맥락** |

**Conclusion:** Bridge and Context are **not two storage objects**. They are **two names for one truth object at different layers**:

- **Context** = L1/L2 **user & product language**
- **Bridge** = L3 **engineering identity (File)**

### Should we remove Bridge?

| Remove Bridge | Keep Bridge |
|---------------|-------------|
| One less term | **File vs Process** split needs a **memory id** name |
| Context already user-facing | **Experience Bridge** protocol needs disambiguation from memory unit |
| | **2028 re-trip** needs stable `bridgeId` ≠ `runtimeId` |
| | “Context” cannot mean that — it already means 6+ things |

**Recommendation: Keep Bridge (L3). Narrow Context to L1 umbrella only. Do not merge into one word.**

Bridge is **not** “Context Collection” — it **is** the committed experience identity. Collections are projections (Feed, pins, Hub resources) **on** Bridge.

---

## 6. Canonical Vocabulary v1 — definitions

Each entry: **one sentence** · role · owner layer · lifecycle · relations.

---

### Bridge

**Definition:** A stable memory identity that records what happened (people, place, time, captures) and never owns execution plans.

| | |
|---|---|
| **Role** | Truth / File / Identity |
| **Owner layer** | FACT → committed via **Commit** (L5 write to truth store) |
| **Lifecycle** | Created → enriched → archived; long-lived |
| **Relations** | 1 Bridge → N **ContainerRuntime**; Hub/resources **project on** Bridge; **Experience Bridge** is optional social layer **on** Bridge |
| **Code SSOT** | `EventCandidate` · `bridgeId` |
| **Question** | What happened? |

---

### Context *(L1/L2 only — not an SSOT type)*

**Definition:** The user-facing word for a lived situation on the globe, implemented in code as a **Bridge** (`EventCandidate`).

| | |
|---|---|
| **Role** | UX / product label only |
| **Owner layer** | L1 copy · L2 PRD |
| **Lifecycle** | N/A (label) |
| **Relations** | Maps 1:1 to **Bridge** in L3; must not name storage tables or runtime objects |
| **Code** | Do **not** introduce new types named `Context` |
| **Question** | (User emotion) “이게 무슚 맥락이지?” |

---

### Container *(Context OS)*

**Definition:** A mutable runtime session that executes a workflow against one Bridge and holds Blueprint state until completed or suspended.

| | |
|---|---|
| **Role** | Process / Runtime / State |
| **Owner layer** | Spawned by **Globe AI** (L1); state mutated by execution + **Container AI** |
| **Lifecycle** | `active` → `completed` \| `suspended` |
| **Relations** | N Containers per Bridge; 1 active **Blueprint** revision per Container session; **Container AI** is the operator UI |
| **Code SSOT** | `ContainerRuntime` · `runtimeId` |
| **Question** | What is happening? |

---

### Blueprint

**Definition:** An immutable contract that specifies how a Container should run (executors, resources, approval policy) without performing execution.

| | |
|---|---|
| **Role** | Process specification |
| **Owner layer** | L2 — composed only by **Globe AI**; supersede = new revision |
| **Lifecycle** | Composed → handed to L3 → replaced on supersede |
| **Relations** | Belongs to **Container** (`runtimeId`); references **Bridge** (`bridgeId`); holds **ExecutionGraph** |
| **Code SSOT** | `ContextBlueprint` |
| **Question** | How should it happen? |

---

### Execution Graph

**Definition:** The ordered task graph inside a Blueprint that states what happens next at each phase and which resources/actions apply per node.

| | |
|---|---|
| **Role** | Scheduler / task DAG |
| **Owner layer** | L2 wire; status updated by L3/L4 observation |
| **Lifecycle** | Node statuses: pending → ready → running → prepared → done/blocked |
| **Relations** | **Only on Container** (via Blueprint); **never on Bridge**; read by **Container AI** every turn |
| **Code SSOT** | `ExecutionGraph` · `ExecutionGraphNode` |
| **Question** | What happens next? |

---

### Globe AI

**Definition:** The L1 architect that understands Intent, selects or creates a Bridge, spawns a Container runtime, composes Blueprint, and dispatches Domain executors.

| | |
|---|---|
| **Role** | Architect |
| **Owner layer** | L1 |
| **Lifecycle** | Per ingress intent (not long-lived chat session) |
| **Relations** | Creates **Bridge** + **Container** + **Blueprint**; does **not** operate inside Container (that is **Container AI**) |
| **Code** | `planContextRun` · composer · `ensureTripContextEvent` (converge target) |
| **Question** | What container should exist and with what spec? |

---

### Container AI

**Definition:** The single user-visible operator inside an active Container that reads the Execution Graph and routes each message to internal modules (Travel Brain, Condition, Domain router).

| | |
|---|---|
| **Role** | Operator |
| **Owner layer** | Product surface; orchestrates L3/L4 modules |
| **Lifecycle** | While Container `active` and user in session |
| **Relations** | Reads **Blueprint**; never creates Blueprint; invokes **Context Condition AI** internally |
| **Code SSOT** | `lib/container-ai/` · prompt frame UI |
| **L1 label** | Trip Assistant (travel) · per `CONTAINER_AI_USER_LABELS` |
| **Question** | What should I do in this step? |

---

### Domain AI

**Definition:** An L3 specialist that executes one domain (lodging, transit, trade, medical) by reading Blueprint and returning prepared artifacts, never committing reality alone.

| | |
|---|---|
| **Role** | Specialist execute |
| **Owner layer** | L3 |
| **Lifecycle** | Per assigned **ExecutionGraph** node / user request routed by Container AI |
| **Relations** | Reads **Blueprint**; output → Ghost Pins / prepared actions → **Commit** gate |
| **Code** | `DomainExecutorId` · `lib/globe/lodging-agent/` · hub pipelines |
| **Question** | How does this domain prepare the action? |

---

### Context Condition AI *(internal)*

**Definition:** An L4 reactive module that evaluates anchor + condition signals (distance, price band, nearby) and projects candidate pins without creating Blueprint or committing truth.

| | |
|---|---|
| **Role** | React (internal) |
| **Owner layer** | L4 — invoked by **Container AI** |
| **Lifecycle** | Per condition prompt / signal |
| **Relations** | Reads **Bridge** truth + **Blueprint** phase; never user-facing name |
| **Code SSOT** | `lib/globe/context-condition-ai/` |
| **Question** | What changed in situation near this anchor? |

---

### Commit

**Definition:** The explicit L5 gate that mutates reality (bookings, calendar, payments, EventCandidate truth) only after human approval when required.

| | |
|---|---|
| **Role** | System call (gated) |
| **Owner layer** | L5 |
| **Lifecycle** | Prepared → waiting_approval → committed |
| **Relations** | Updates **Bridge** truth; completes **Container** steps; Ghost → solid only here |
| **Code SSOT** | `lib/source-of-truth/commit-truth.ts` · Field FSM |
| **Question** | Make it real? |

---

## 7. Qualified terms (not in v1 core — do not confuse)

| Term | Meaning | v1 rule |
|------|---------|---------|
| **Experience Bridge** | Multi-user shared experience protocol | Always two words |
| **Execution Space** | Spatial map projection / travel MVP WHERE graph | Not a substitute for Execution Graph |
| **Context Run** | Legacy/single ingress router | Migrating toward Globe AI + Container spawn |
| **Global Brain** | LLM prompt context assembler | Not user AI; not Container AI |
| **GoalBucket** *(proposed)* | Legacy `ContainerRecord` | Do not use “Container” for OS Process |

---

## 8. PR gate checklist

1. Does this PR introduce a new meaning for **Context** or **Container**?
2. Does any **Bridge** metadata store **ExecutionGraph**? → reject
3. Is **Context Condition AI** shown in UI copy? → reject (use Container AI / Trip Assistant)
4. Does **Globe AI** operate inside an active Container session? → reject (use Container AI)
5. One object, two responsibilities? → split or qualify

---

## 9. Document map

| Topic | Doc |
|-------|-----|
| Bridge vs Container File/Process | `RIMVIO_BRIDGE_VS_CONTAINER.md` |
| Five layers + Article 0 | `RIMVIO_CONTEXT_OS_ARCHITECTURE.md` |
| Container AI operator | `RIMVIO_CONTAINER_AI.md` |
| Execution Graph Method 2 | `RIMVIO_EXECUTION_GRAPH.md` |
| Story L1 vs L3 | `RIMVIO_STORY_LAYER.md` |
| ADRs | 005 · 007 · 008 · 009 |

**This document is the vocabulary SSOT.** When docs disagree, update them to match v1 or mark legacy explicitly.
