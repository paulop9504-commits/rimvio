/**
 * lib/ import boundary rules — see docs/LIB_BOUNDARIES.md
 */

/** Top-level lib domain from posix path `lib/foo/...`. */
export function libDomain(relPosix) {
  const match = relPosix.match(/^lib\/([^/]+)/);
  return match?.[1] ?? null;
}

export const L0_SUBSTRATE = new Set([
  "events",
  "copy",
  "i18n",
  "utils",
  "types",
  "supabase",
  "core",
  "life-read-model",
  "source-of-truth",
  "preference",
  "local-links",
  "layers",
  "brand",
  "design",
  "ontology",
  "container-store",
  "containers",
  "surface-contract",
]);

export const L1_DOMAIN = new Set([
  "globe",
  "feed",
  "peer-chat",
  "experience-bridge",
  "vault",
  "share",
  "ingest",
  "media-pool",
  "experience-graph",
  "experience-intent",
  "experience-context",
  "experience-window",
  "experience-room",
]);

export const L2_INTELLIGENCE = new Set([
  "action-chat",
  "event-kernel",
  "event-os",
  "surface-engine",
  "goal-engine",
  "goal-roadmap",
  "intent",
  "global-brain",
  "conversation-memory",
]);

export const L3_LAB = new Set(["testing", "demo", "deos"]);

/** L1 product domains — must not reach orchestrator / event-os directly. */
export const L1_ISOLATED = new Set([
  "globe",
  "feed",
  "peer-chat",
  "experience-bridge",
]);

/** Prod modules allowed to reach L3 lab (explicit bridges). */
const LAB_IMPORT_ALLOWED = new Set([
  "self-learning|testing",
  "threadline|deos",
]);

/**
 * @returns {{ id: string, message: string, test: (from: string, to: string) => boolean }[]}
 */
export function boundaryRules() {
  return [
    {
      id: "no-lab-imports",
      message: "Production lib must not import lib/testing|demo|deos (L3 lab)",
      test: (from, to) =>
        !L3_LAB.has(from) &&
        L3_LAB.has(to) &&
        !LAB_IMPORT_ALLOWED.has(`${from}|${to}`),
    },
    {
      id: "l1-no-action-chat",
      message: "L1 domain must not import action-chat — use life-read-model / public APIs",
      test: (from, to) => L1_ISOLATED.has(from) && to === "action-chat",
    },
    {
      id: "l1-no-event-os",
      message: "L1 domain must not import event-os directly",
      test: (from, to) => L1_ISOLATED.has(from) && to === "event-os",
    },
    {
      id: "l1-no-surface-engine",
      message: "L1 domain must not import surface-engine directly",
      test: (from, to) => L1_ISOLATED.has(from) && to === "surface-engine",
    },
    {
      id: "l0-no-intelligence",
      message: "L0 substrate must not import L2 intelligence layers",
      test: (from, to) => L0_SUBSTRATE.has(from) && L2_INTELLIGENCE.has(to),
    },
    {
      id: "l0-no-domain",
      message: "L0 substrate must not import L1 product domains",
      test: (from, to) => L0_SUBSTRATE.has(from) && L1_DOMAIN.has(to),
    },
  ];
}
