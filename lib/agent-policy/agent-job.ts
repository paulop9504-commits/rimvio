/**
 * Agent Job — explicit work unit so B is never silently absorbed into A.
 * P0 · Job Boundary / Scope Lock substrate.
 */

export const AGENT_JOB_INTENTS = [
  "discover",
  "refine",
  "modify",
  "prepare",
] as const;

export type AgentJobIntent = (typeof AGENT_JOB_INTENTS)[number];

export const AGENT_JOB_TARGETS = [
  "lodging",
  "eatery",
  "poi",
  "amenity",
  "map",
  "mixed",
] as const;

export type AgentJobTarget = (typeof AGENT_JOB_TARGETS)[number];

export type AgentJobScope = {
  /** Domains soft-next may auto-enter (empty = none). */
  readonly allowSoftNextTargets: readonly AgentJobTarget[];
  /** Patch kinds permitted without forcing a new Job. */
  readonly allowPatchKinds: readonly string[];
};

export type AgentJob = {
  readonly id: string;
  /** Short goal line — what this Job is trying to finish. */
  readonly goalKo: string;
  readonly intent: AgentJobIntent;
  readonly target: AgentJobTarget;
  readonly scope: AgentJobScope;
  readonly status: "active" | "paused" | "done";
  /** Scout fingerprint — stale when next turn differs. */
  readonly scoutFingerprint: string | null;
  readonly startedAtIso: string;
  readonly lastUtterance: string | null;
};

const DISCOVER_LODGING_SCOPE: AgentJobScope = {
  allowSoftNextTargets: [],
  allowPatchKinds: [
    "filter_entity",
    "spatial_constraint",
    "replace_entity",
    "select_entity",
    "delete_entity",
  ],
};

const DISCOVER_EATERY_SCOPE: AgentJobScope = {
  allowSoftNextTargets: [],
  allowPatchKinds: [
    "filter_entity",
    "spatial_constraint",
    "replace_entity",
    "select_entity",
    "delete_entity",
  ],
};

const REFINE_SCOPE: AgentJobScope = {
  allowSoftNextTargets: [],
  allowPatchKinds: ["filter_entity", "select_entity", "delete_entity"],
};

function newJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function resolveAgentJobTargetFromUtterance(
  utterance: string,
): AgentJobTarget {
  const t = utterance.trim();
  // 「맛집도」 / 「호텔도」 — explicit Target stack still resolves Target.
  if (/맛집|식당|카페|restaurant|eatery|이자카야/iu.test(t)) return "eatery";
  if (/놀거리|관광|명소|poi|usj|유니버설|유니버셜/iu.test(t)) return "poi";
  if (/편의|약국|atm|amenity/iu.test(t)) return "amenity";
  if (/노선|메트로|지하철|jr|지도에\s*보여/iu.test(t)) return "map";
  if (/호텔|숙소|캡슐|료칸|lodging|hotel/iu.test(t)) return "lodging";
  return "mixed";
}

function goalKoFromUtterance(
  utterance: string,
  target: AgentJobTarget,
): string {
  const raw = utterance.trim().replace(/\s+/gu, " ");
  if (raw.length <= 40) return raw || target;
  return `${raw.slice(0, 39).trimEnd()}…`;
}

export function beginAgentJob(input: {
  readonly utterance: string;
  readonly intent: AgentJobIntent;
  readonly target?: AgentJobTarget;
  readonly scoutFingerprint?: string | null;
}): AgentJob {
  const target =
    input.target ?? resolveAgentJobTargetFromUtterance(input.utterance);
  const scope =
    input.intent === "refine"
      ? REFINE_SCOPE
      : target === "eatery"
        ? DISCOVER_EATERY_SCOPE
        : target === "lodging"
          ? DISCOVER_LODGING_SCOPE
          : {
              allowSoftNextTargets: [],
              allowPatchKinds: DISCOVER_LODGING_SCOPE.allowPatchKinds,
            };
  return {
    id: newJobId(),
    goalKo: goalKoFromUtterance(input.utterance, target),
    intent: input.intent,
    target,
    scope,
    status: "active",
    scoutFingerprint: input.scoutFingerprint ?? null,
    startedAtIso: new Date().toISOString(),
    lastUtterance: input.utterance.trim() || null,
  };
}

export function withAgentJobFingerprint(
  job: AgentJob,
  fingerprint: string,
): AgentJob {
  return { ...job, scoutFingerprint: fingerprint };
}

/**
 * Soft-next domain allowed only if in Job scope, or user explicitly stacked ("맛집도").
 */
export function isSoftNextTargetAllowed(input: {
  readonly job: AgentJob | null | undefined;
  readonly nextTarget: AgentJobTarget;
  readonly lastUtterance: string;
}): boolean {
  if (!input.job || input.job.status !== "active") return false;
  if (input.job.scope.allowSoftNextTargets.includes(input.nextTarget)) {
    return true;
  }
  // Explicit stack — user asked to widen this turn/previous turn.
  if (
    /(?:그리고|또|도)\s*(?:찾아|보여|해)|맛집도|호텔도|숙소도|놀거리도/iu.test(
      input.lastUtterance,
    )
  ) {
    return true;
  }
  return false;
}
