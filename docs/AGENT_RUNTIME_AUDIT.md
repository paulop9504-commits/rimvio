# Agent Runtime Audit — Autonomous Execution Loop (P0)

> Rimvio = NL → Plan → Agent → Observe → Act → Verify → Replan → Commit  
> **Do not add parallel runtimes.** Extend ADR-045 spine + existing modules.

## Pipeline map (actual file:function)

| Stage | Module | Entry |
|-------|--------|-------|
| **User Entry** | `context-run/dispatch-context-run.ts` | `dispatchContextRun()` |
| | `context-run/commit-text-context.ts` | `commitTextContextIngress()` |
| | `context-run/run-natural-language-pipeline.ts` | `runNaturalLanguagePipeline()` |
| | `context-run/apply-globe-workspace-agent-turn.ts` | `applyGlobeWorkspaceAgentTurn()` |
| **Agent Entry** | `context-run/agent-product-pipeline.ts` | `beginAgentProductTurn()` |
| | `workstream/rimvio-agent-runtime.ts` | `enterRimvioAgentRuntime()` |
| | `agent/agent-controller.ts` | `runAgentController()` |
| **Planner** | `action-planner/build-*.ts` | `buildActionPlan`, `buildTripPrepActionPlan` |
| | `agent/create-action-plan.ts` | `createActionPlanWithMeta()` |
| | `reality-planner/decompose-goal.ts` | `decomposeGoal()` |
| | `context-run/compile-workspace-agent-plan.ts` | `compileWorkspaceAgentPlan()` |
| **Executor** | `agent-orchestrator/domain-agent-executor.ts` | `executeDomainAgentTask()` |
| | `agent-orchestrator/observe-decide-loop.ts` | `runObserveDecideLoop()` |
| | `agent-orchestrator/pipeline-step-executor.ts` | `createAgentDispatchStepExecutor()` |
| | `action-planner/run-action-plan.ts` | `executeActionPlanAsync()` |
| | `context-run/workspace-agent-loop.ts` | `runWorkspaceAgentLoop()` |
| **Tool Gateway** | `tool-registry/invoke-rimvio-tool.ts` | `invokeRimvioTool(Async)()` |
| **Observation** | `agent/observation.ts` | `buildAgentObservation()`, `normalizeToolInvokeResult()` |
| **Workspace Mutation** | `context-workspace/workspace-patch` | `applyWorkspacePatch()` |
| | `graph-command/apply-graph-commands.ts` | `applyGraphCommandsAsync()` |
| **Verification** | `agent-policy/postcondition-check.ts` | `assertAgentPostcondition()` |
| | `agent-orchestrator/goal-convergence.ts` | `evaluateGoalConvergence()` |
| **Replan** | `reality-planner/replan-on-failure.ts` | `replanOnFailure()` |
| | `agent-orchestrator/semantic-replan.ts` | `semanticReplanFromFailure()` |
| | `agent/decision.ts` | `decideNextAction()` |
| **Human Commit** | `reality-commit/` | `assertHumanRealityCommit()` |
| **Capability Ledger** | `capability-ledger/record-capability-execution.ts` | `recordCapabilityExecution()` |
| | `capability-ledger/developer-wallet.ts` | `getDeveloperWallet()` |
| | `tool-registry/invoke-rimvio-tool.ts` | `invokeRimvioToolAsync` + ledger hook |

## Stub → Real (this work)

| Before | After |
|--------|-------|
| `dispatchAgentTasks` returns metadata only | Delegates to `executeDomainAgentTask` + observe-decide loop |
| Plan complete = done | `evaluateGoalConvergence` separates plan vs goal |
| Retry-only replan | `semanticReplanFromFailure` + existing `replanOnFailure` |

## Loop budgets (SSOT)

- `AGENT_LOOP_LIMITS` — `lib/agent/loop/agent-state.ts`
- Controller max iterations — `DEFAULT_MAX_ITERATIONS = 3` in `agent-controller.ts`
- Orchestrator — `MAX_AGENT_ITERATIONS = 12`, `MAX_REPLANS = 3` in `execution-context.ts`

## Tests

```bash
npm run test:agent-runtime-autonomous
npm run test:capability-ledger
npm run test:agent-runtime
npx tsx scripts/test-reality-pipeline.ts
```
