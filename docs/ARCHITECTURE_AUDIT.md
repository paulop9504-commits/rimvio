# Rimvio Agent — Architecture Audit

**Date:** 2026-08-29  
**Scope:** Hub Platform Agent + Travel Agent stacks  
**Registry:** `lib/hub/dev/agent-capability-registry.ts`

---

## 1. Request flow (Hub — canonical for Creator)

```text
HubDevAgentOperator (UI)
  → agentSeed → HubDevOperatorAgentBridge
  → runHubAgentController                    [EXISTS]
       → runConversationGate                 [EXISTS]
       → shortcuts: inspect / test / connect [EXISTS]
       → runHubAgentLoop                     [EXISTS]
            → observe (skip if code_direct)  [PARTIAL]
            → planHubAgentTurn               [PARTIAL]
            → invokeHubWorkspaceTool         [EXISTS]
            → verify / replan                [PARTIAL]
  → PlatformDraft (wizard localStorage)      [EXISTS]
  → AgentEventLog → Activity/Terminal/Changes [PARTIAL]
```

## 2. Request flow (Travel — separate, do not merge)

```text
NL Pipeline → runAgentController             [EXISTS]
  → createActionPlanWithMeta / buildActionPlan
  → executeActionPlanAsync → invokeRimvioTool

Context Workspace → tryApplyWorkspacePromptTurn [EXISTS]
  → Context Workspace store (lodging/map)
```

**[DUPLICATED]** Intent handling: `lib/agent/conversation/*` (Hub) vs `lib/agent/intent/*` (re-export shim) vs travel `classify-intent-family.ts`. **Canonical for Hub:** `lib/agent/conversation/`.

---

## 3. Component matrix

| Area | Path | Status |
|------|------|--------|
| Hub ingress | `lib/hub/dev/hub-agent-controller.ts` | **[EXISTS]** |
| Conversation gate | `lib/agent/conversation/conversation-gate.ts` | **[EXISTS]** |
| Intent classify | `lib/agent/conversation/classify-intent.ts` | **[PARTIAL]** → Cap #1 formalizing |
| Goal compile | `lib/hub/dev/platform-agent/platform-goal.ts` | **[PARTIAL]** Cap #2 |
| Agent loop | `lib/hub/dev/hub-agent-loop.ts` | **[EXISTS]** |
| Platform planner | `lib/hub/dev/platform-agent/platform-planner.ts` | **[PARTIAL]** |
| Intent compiler | `lib/hub/dev/hub-intent-compiler.ts` | **[PARTIAL]** |
| Tool gateway (Hub) | `lib/hub/dev/hub-workspace-tools.ts` | **[EXISTS]** |
| Tool catalog | `lib/hub/dev/hub-tool-catalog.ts` | **[EXISTS]** |
| Approval | `lib/agent/approval/approval-engine.ts` | **[EXISTS]** |
| Events SSOT | `lib/agent/events/` | **[PARTIAL]** |
| Observation | `lib/agent/hub-observation/` | **[EXISTS]** |
| Platform model | `lib/hub/platform/types.ts` | **[EXISTS]** |
| Source map | `lib/hub/dev/platform-agent/platform-source-map.ts` | **[PARTIAL]** |
| Coding sandbox | `lib/hub/dev/coding-agent/` | **[PARTIAL]** |
| Travel tool gateway | `lib/tool-registry/invoke-rimvio-tool.ts` | **[EXISTS]** — not Hub |
| ADR-045 runtime | `lib/workstream/rimvio-agent-runtime.ts` | **[PARTIAL]** Hub uses strategy only |
| Agent state | `lib/agent/loop/agent-state.ts` | **[PARTIAL]** not fully wired |
| ChangeSet / Undo | — | **[MISSING]** |
| Preview agent verify | `lib/hub/dev/sandbox-preview.ts` | **[PARTIAL]** |
| Publish | `lib/hub/deploy/hub-deploy-runtime.ts` | **[PARTIAL]** |
| Fake UI progress | `hub-dev-agent-operator.tsx` analyzing effect | **[BROKEN→FIXED]** demo-only path |

---

## 4. Intent handling analysis

| Behavior | Status |
|----------|--------|
| `ㅎㅇ` → chat, no execution | **[EXISTS]** gate + tests |
| create vs modify vs inspect | **[EXISTS]** deterministic patterns |
| currentPlatform ≠ user intent | **[EXISTS]** gate ignores stale goal |
| Formal Capability #1 contract | **[MISSING]** → this sprint |
| Reference resolution (#5) | **[MISSING]** |
| Conversation memory (#10) | **[PARTIAL]** event log only |

---

## 5. Platform model

| Model | Path | Status |
|-------|------|--------|
| PlatformDraft | `lib/hub/platform/types.ts` | **[EXISTS]** |
| CapabilityAction | `lib/hub/capability/types.ts` | **[EXISTS]** |
| Workflow | string `workflowDescription` + `workflow-graph.ts` | **[PARTIAL]** no IR execution |
| Schema | on CapabilityAction | **[EXISTS]** |
| Permission | draft.permissions | **[EXISTS]** |
| Connection | `lib/integrations/hub-platform/` | **[EXISTS]** |
| Dependency graph | `context-discovery.ts` DEPENDENCY_EDGES | **[PARTIAL]** |

---

## 6. Workspace mutation

```text
invokeHubWorkspaceTool → ctx.updateDraft → wizard → buildProjectSnapshot → UI
```

Virtual files (`hub-file-tree.ts`) ≠ real repo. **[PARTIAL]**

---

## 7. Test / verify / preview / publish

| Stage | Status |
|-------|--------|
| Sandbox test | **[PARTIAL]** simulated in wizard |
| test.run tool | **[EXISTS]** |
| verify loop | **[PARTIAL]** hardcoded payment.commit repair |
| preview.run | **[PARTIAL]** |
| deploy.prepare | **[EXISTS]** |
| E2E scripts | **[EXISTS]** test-hub-intent-gate, test-hub-platform-agent |

---

## 8. Source / file access

| Capability | Status |
|------------|--------|
| Virtual file tree | **[PARTIAL]** |
| code.readFile / modifyFile | **[PARTIAL]** sandbox only |
| Real repo grep/AST | **[MISSING]** |

---

## 9. Minimal extension plan (no parallel systems)

Extend in place:

1. `lib/agent/capabilities/` — one folder per capability contract + impl
2. `hub-agent-controller.ts` — call capabilities, not ad-hoc logic
3. `hub-workspace-tools.ts` — single tool gateway
4. `agent-event-bridge.ts` — map capability events to UI

Do **not** create `lib/new-agent-runtime` or second tool gateway.

---

## 10. Capability implementation program

See `docs/CAPABILITY_IMPLEMENTATION.md`.

**Current sprint:** Capability #1 only — Intent Understanding.

**Next (blocked until #1 COMPLETE):** #2 Goal Extraction.
