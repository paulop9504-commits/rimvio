# ADR-062: Rimvio Core vs Dev Runtime — Agent Loop, State, Protocol

**Status:** Accepted  
**Date:** 2026-08-29  
**Parent:** ADR-045 · ADR-050 · ADR-061 · [RIMVIO_CORE_OS.md](../RIMVIO_CORE_OS.md)

## Context

Rimvio must scale as an ecosystem: Devs publish **Capabilities**, **Runtimes**, **Infrastructure**, and **Adapters** — not only Rimvio-built runtimes. Security and agent behavior cannot be delegated; **Agent Loop + State + Policy** stay Rimvio Core.

## Decision

### Layer split

```text
                         RIMVIO
                           │
                    ┌──────┴──────┐
                    │             │
                Agent Core      Hub
                    │             │
          Planner · State · Policy │
                    │             │
              Agent Loop          │
                    │             │
         Tool Registry / Capability Resolver
                    │             │
              Runtime Router  ←── Hub stores
                    │
       ┌────────────┼─────────────┐
       ↓            ↓             ↓
  Rimvio Core   Dev Runtime   Cloud Runtime
   Runtime          │             │
       │            ↓             ↓
       ↓      Infrastructure   APIs
  Computer      (via Adapter)
```

| Layer | Owner | Dev may extend? |
|-------|-------|-----------------|
| Agent Loop | **Rimvio Core** | No |
| Task State (SSOT) | **Rimvio Core** | No — subscribe only |
| Planner / Reasoner | **Rimvio Core** | No |
| Permission / Policy | **Rimvio Core** | Declare via SDK; Core enforces |
| Tool Registry | **Rimvio Core** | Register tools via Hub |
| Capability Registry | **Rimvio Core** + Hub | Publish capabilities |
| Compatibility Engine | **Rimvio Core** | Grants via Hub |
| Runtime Router | **Rimvio Core** | No |
| **Runtime Protocol** | **Rimvio Standard** | **Implement** (Core + Dev) |
| Runtime implementation | Rimvio Core + **Dev** | Yes — Hub register |
| Infrastructure | **Dev** | Yes — Hub register |
| Adapter | **Dev** | Yes — Hub register |

### Agent Loop (Rimvio Core)

Conceptual loop — LLM inside the loop with **Observation → replan**:

```text
while task.status != completed:
  context = state.get()
  plan = agent.decide(goal, context, scoped_tools)
  result = runtime_router.execute(plan.next_action)
  state.update(result)
  if failed → replan
  if requires_approval → pause
  if done → complete + checkpoint
```

**Wire (current):** `enterAgentSpine` · `workspace-agent-loop.ts` · `run-workspace-agent-plan.ts` · ADR-045 stages.

### Task State SSOT

Task is the durable unit — not chat transcript.

**Wire types:** `lib/rimvio-core/task-state.ts`  
**Wire (partial today):** `lib/workstream/agent-execution-session.ts` · `build-agent-execution-state.ts` · Context Work State ADR-038.

Future: Supabase persistence + realtime UI subscription.

### Capability must not call OS directly

```text
Capability → Rimvio Interface → Runtime Router → Runtime → Infrastructure
```

❌ Capability → direct OS / payment / filesystem  
⭕ Capability → declared tools + permissions → Runtime Protocol

### Rimvio Runtime Protocol (standard)

Dev implements; Rimvio verifies at Hub publish.

Methods: `execute` · `observe` · `pause` · `resume` · `cancel`  
Surfaces: filesystem · terminal · browser · git · network · process · context · permission

**Wire types:** `lib/rimvio-core/runtime-protocol.ts`  
**Wire (MVP registry):** `lib/hub/dev/runtime-registry.ts`

### Hub — four stores, one standard

| Store | SSOT (MVP) |
|-------|------------|
| Capability Store | `lib/platform-sdk/capability-index.ts` |
| Runtime Store | `lib/hub/dev/runtime-registry.ts` |
| Infrastructure Store | `lib/hub/dev/infrastructure-registry.ts` |
| Adapter Store | `lib/hub/dev/adapter-registry.ts` |

Core vs extension runtime: `tier: "core" | "extension"` in runtime index.  
**Security:** `securityPolicy: "rimvio-enforced"` — Dev cannot disable Permission / Verification.

### Rimvio builds (product)

- Agent Loop · Task State · Planner · Runtime Router  
- Permission · Checkpoint · Recovery  
- Tool Registry · Capability Registry · Compatibility Engine  

### Dev builds (SDK + Hub)

- Capability · Tool · Runtime · Adapter · Infrastructure connector  
- Hub certification per ADR-061  

**SDK surface (target):** `createCapability()` · `createRuntime()` · `defineTool()` · `definePermission()` · manifest generation.

## Consequences

- New agent features extend **Core stages**, not parallel loops (ADR-045).  
- New execution environments publish **Runtime** to Hub, not fork Agent Loop.  
- UI shows Task State from SSOT, not chat essays (ADR-039).  
- Tool Registry scopes tools per task — not full catalog every turn.

## PR reject

- Capability importing OS APIs without Runtime Protocol  
- Dev Runtime bypassing Permission / Security Policy  
- Chat transcript as Task SSOT  
- Parallel Agent Loop package  
- Rimvio operating all Runtimes directly (no Hub registration path for extensions)
