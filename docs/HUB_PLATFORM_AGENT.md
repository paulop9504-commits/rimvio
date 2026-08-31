# Rimvio Hub Platform Agent — North Star (P0–P10)

Platform Agent + Coding Agent architecture SSOT. Extends existing Hub Agent spine.

See `lib/hub/dev/platform-agent/` and `lib/hub/dev/coding-agent/`.

**Dev Agent OS (product engineering protocol):** `docs/RIMVIO_DEV_AGENT_OS.md` · `lib/hub/dev/dev-agent-os/` — Loop · Platform · Capability decomposition, development loop, task classification, definition of done. Dev Agent = Developer Build Mode of the same Rimvio Agent (ADR-058).

## Product North Star

> **Rimvio = Platform Agent.** File Tree is an artifact view. Blueprint · Capability · Workflow are primary.

### Intent / Goal — Conversation Gate SSOT

| Utterance | Intent | Agent behavior |
|-----------|--------|----------------|
| `ㅎㅇ` | **chat** | Conversation only → END |
| `호텔 예약 플랫폼 만들어줘` | **create** + Goal ready | New Platform flow |
| `OsakaStay에서 호텔 검색 가격순으로` | **modify** + scoped goal | Modify existing Platform |
| `현재 Platform 분석해줘` | **inspect** | Observe only |

Wire: `lib/agent/conversation/` — `classify-intent` → `goal-resolution` → `conversation-gate` → `compilePlatformGoal`

### Structured Platform Goal (P1)

```ts
type PlatformGoal = {
  goalKind: "create" | "modify" | "inspect" | "test" | "connect" | "publish";
  domain: "hotel_booking" | null;
  requestedCapabilities: string[];
  scope: "new_platform" | { platformName: string } | code_direct;
  ready: boolean;
};
```

Planner receives structured goal — not raw utterance string.

## Platform Execution Loop (Rimvio-native — not Cursor copy)

```text
Goal Intake → Understand → Inspect → Plan → Act → Observe → Verify → Replan → Commit
```

**LLM decides; Orchestrator owns the loop.** Policy · Verifier · Goal State · Execution Contract catch LLM drift.

SSOT: `lib/hub/dev/platform-agent/execution-loop.ts` · `agent-orchestrator.ts`

```text
                 Agent Orchestrator (deterministic)
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Goal State      Planner        Policy
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                     LLM (decision only)
                       ↓
               Capability Executor
                       ↓
                  Observation
                       ↓
                  Verification
                       │
                 ┌─────┴─────┐
                 ↓           ↓
               DONE        REPLAN → Plan (partial surgery)
```

### Cursor vs Rimvio

```text
Cursor:  Goal → Codebase → Edit → Test → Repeat
Rimvio:  Goal → Platform State → Capability Graph → Plan → Execute
         → External World change → Observe → Verify → Replan
         → Workspace Update → User Approval → Commit
```

Rimvio is a **World/Platform Agent**, not a Code Agent.

## Ten core spine primitives

| # | Primitive | Hub SSOT | Workstream SSOT |
|---|-----------|----------|-----------------|
| 1 | **GoalState** | `goal-state.ts` | `context-goal-state.ts` |
| 2 | **AgentExecutionState** | orchestrator + hub events | `build-agent-execution-state.ts` |
| 3 | **CapabilityRegistry** | `agent-capability-registry.ts` | `workstream/agent-capability-registry.ts` |
| 4 | **CapabilityContract** | `hub-tool-catalog.ts` + `rimvio-protocol/capability-contract.ts` | same |
| 5 | **Observation** | `hub-workspace-observe.ts` | `world-state.ts` |
| 6 | **Verifier** | `hub-verify-repair.ts` | `verification-agent.ts` |
| 7 | **Replanner** | `agent-orchestrator.ts` (partial replan) | `replan-workspace-agent-plan.ts` |
| 8 | **DependencyGraph** | `task-decomposition.ts` | `build-context-task-graph.ts` |
| 9 | **Policy/Approval** | `approval-engine.ts` | `agent-policy/` |
| 10 | **ExecutionLedger** | `execution-ledger.ts` | `reality-commit/ledger.ts` (commits) |

**Goal State work board** — Agent never loses progress:

```text
completed: ✓ hotel.search
in_progress: → schema.update
blocked: ✗ payment.prepare (Stripe)
pending: workflow.create · test.run
```

## Capability taxonomy (A–I)

See `RIMVIO_CAPABILITY_TAXONOMY` in `execution-loop.ts` — Understanding · Observation · Planning · Capability Management · Execution · Verification · Recovery · Memory · Governance.

Capabilities are **executable units** with contract:

```text
Capability { id, version, input_schema, output_schema, permissions, side_effects, cost }
ExecutionResult { success, output, events, state_changes, errors, usage }
```

## Platform Agent Loop (Hub P0–P10 mapping)

```text
Understand   ← Conversation Gate + Platform Goal Compiler (P1)
Explore      ← Platform Explorer / observeFullWorkspace (P2)
Plan         ← hub-intent-compiler → capability graph (P2→P3)
Build        ← capability.create · schema.update · workflow.update · UI patch (P3)
Test         ← test.run (P4)
Repair       ← verify fail → dependency/trace → auto patch (P5)
Verify       ← retest loop (P4)
Preview      ← preview.run + agent assertion (P7)
Approval     ← approval-engine + Changes review (P6)
Publish      ← publish.request (P8)
Sync         ← platform.sync after mutations (P9)
```

### Cursor vs Rimvio spine

```text
Cursor:  File → Code → Build → Test
Rimvio:  Platform → Capability → Workflow → Schema
         → Connection → Permission → UI → Runtime → Test → Publish
```

Tool catalog (`hub-tool-catalog.ts`) is Platform-axis. Center pane Blueprint/Capability/Workflow is primary.

## Hub = Creator Studio / Agent Home = YouTube Home

- **Agent Home (`/`)** — Intent · Goal framing · Capsule forest (Globe)
- **Hub Workspace (`/hub/workspace`)** — Goal executable only · Platform Agent Loop

`ㅎㅇ` is conversation everywhere — never triggers workspace analyze.

## Implementation phases

| Phase | Content | Module | Test |
|-------|---------|--------|------|
| **P0** | Chat-only gate (`ㅎㅇ` = no tools) | `conversation-gate.ts` | `test-hub-intent-gate.ts` |
| **P1** | NL → structured `PlatformGoal` → Planner | `platform-goal.ts` | `test-hub-phases-p0-p10.ts` |
| **P2** | 8-axis observe + discovery graph | `context-discovery.ts` | `test-hub-phases-p2-p6.ts` |
| **P3** | Platform mutation E2E | `platform-planner.ts` | `test-hub-capabilities-phase1-5.ts` |
| **P4** | Observe→Act→Verify→Replan | `hub-agent-loop.ts` | `test-hub-phases-p0-p10.ts` |
| **P5** | Issue graph verify-repair + regression | `hub-verify-repair.ts` | `test-hub-phases-p5-p12.ts` |
| **P6** | Activity + Diff + Review + checkpoint | `hub-checkpoint-store.ts` | `test-hub-phases-p5-p12.ts` |
| **P7** | Preview + browser agent verify | `preview-agent-verify.ts` | `test-hub-phases-p0-p10.ts` |
| **P8** | Connection / Deploy / Publish | `hub-publish-flow.ts` | OAuth + publish tests |
| **P9** | Platform ↔ source sync | `platform-source-sync.ts` | `test-hub-phases-p5-p12.ts` |
| **P10** | Dev mode layout (Activity/Terminal auto) | `developer-mode/` | `test-hub-phases-p0-p10.ts` |
| **P11–12** | Computer Use skeleton | `developer-mode/planComputerUse` | frozen |

## Runtime ingress

```text
USER → Conversation Gate → Platform Goal → Platform Planner
     → Context Discovery → Platform/Coding tools → Verify → Repair → Preview
     → Checkpoint → Approve → Publish → Source Sync
```

Coding Agent is a sub-layer under Platform reasoning — not a separate UX.

## Run tests

```bash
npx tsx scripts/test-hub-execution-loop.ts
npx tsx scripts/test-hub-phases-p0-p10.ts
npx tsx scripts/test-hub-intent-gate.ts
npx tsx scripts/test-hub-phases-p2-p6.ts
npx tsx scripts/test-hub-phases-p5-p12.ts
npx tsx scripts/test-hub-capabilities-phase1-5.ts
```
