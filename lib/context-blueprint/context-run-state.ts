/**
 * Context OS runtime state machine — which layer may act when.
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md § State transitions
 */

export const CONTEXT_RUN_STATES = [
  "intent",
  "blueprint_created",
  "execution_planned",
  "plan_waiting_approval",
  "executing",
  "execution_prepared",
  "waiting_approval",
  "committed",
  "observed",
  "reacted",
] as const;

export type ContextRunState = (typeof CONTEXT_RUN_STATES)[number];

/** Layer allowed to advance FROM this state. */
export const CONTEXT_RUN_STATE_OWNER: Record<ContextRunState, string> = {
  intent: "L1",
  blueprint_created: "L1→L2 handoff complete; L3 may start",
  execution_planned: "L3 — Execution Plan (preview · order)",
  plan_waiting_approval: "L3→user — plan gate before Runtime",
  executing: "L3 — Execution Runtime",
  execution_prepared: "L3",
  waiting_approval: "L5 gate (user) — Commit approval",
  committed: "L5",
  observed: "L4 watch",
  reacted: "L4",
};

export const CONTEXT_RUN_TRANSITIONS: ReadonlyArray<{
  from: ContextRunState;
  to: ContextRunState;
  owner: string;
  action: string;
}> = [
  {
    from: "intent",
    to: "blueprint_created",
    owner: "L1",
    action: "composeContextBlueprint + dispatch",
  },
  {
    from: "blueprint_created",
    to: "execution_planned",
    owner: "L3",
    action: "compose Execution Plan from Blueprint",
  },
  {
    from: "blueprint_created",
    to: "executing",
    owner: "L3",
    action: "legacy direct runtime (skip plan preview)",
  },
  {
    from: "execution_planned",
    to: "plan_waiting_approval",
    owner: "L3→user",
    action: "surface plan preview · await user confirm",
  },
  {
    from: "execution_planned",
    to: "executing",
    owner: "L3",
    action: "auto-start Runtime (approval: auto)",
  },
  {
    from: "plan_waiting_approval",
    to: "executing",
    owner: "L3",
    action: "user approved plan · start Runtime",
  },
  {
    from: "execution_planned",
    to: "execution_prepared",
    owner: "L3",
    action: "fast-path prep without long runtime loop",
  },
  {
    from: "executing",
    to: "execution_prepared",
    owner: "L3",
    action: "Ghost Pins · prepared actions · no Commit",
  },
  {
    from: "execution_prepared",
    to: "waiting_approval",
    owner: "L3→L5",
    action: "surface approval UI · approvalPolicy gate",
  },
  {
    from: "waiting_approval",
    to: "committed",
    owner: "L5",
    action: "user approves · commit-truth",
  },
  {
    from: "committed",
    to: "observed",
    owner: "L4",
    action: "watch truth + external signals",
  },
  {
    from: "observed",
    to: "reacted",
    owner: "L4",
    action: "tasks · Ghost Pins · notify · never new Blueprint",
  },
  {
    from: "reacted",
    to: "executing",
    owner: "L3",
    action: "optional re-run within existing Blueprint scope only",
  },
];

export function isValidContextRunTransition(input: {
  from: ContextRunState;
  to: ContextRunState;
}): boolean {
  return CONTEXT_RUN_TRANSITIONS.some(
    (row) => row.from === input.from && row.to === input.to,
  );
}

export function resolveContextRunStateOwner(state: ContextRunState): string {
  return CONTEXT_RUN_STATE_OWNER[state];
}
