/**
 * Guard decisions are judgment only — Agent Loop / Tools execute.
 * Guard ≠ Tool ≠ Patch.
 */

export const AGENT_GUARD_CODES = [
  "ambiguity",
  "action_level",
  "mutation_scope",
  "idempotent",
  "job_interrupt",
  "ask_clarify",
] as const;

export type AgentGuardCode = (typeof AGENT_GUARD_CODES)[number];

export type GuardDecision =
  | {
      readonly action: "STOP";
      readonly code: AgentGuardCode;
      readonly statusKo: string;
    }
  | {
      readonly action: "ASK";
      readonly code: "ask_clarify" | "ambiguity";
      readonly statusKo: string;
      readonly candidates?: readonly {
        readonly id: string;
        readonly labelKo: string;
      }[];
    }
  | {
      readonly action: "CONTINUE";
      readonly statusKo: string | null;
    };
