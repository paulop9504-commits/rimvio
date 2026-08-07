/**
 * RIMVIO Command — Create | Continue | Execute (ADR-035).
 * Distinct from @-token `routeRimvioCommand` in lib/command-router.
 */

export const RIMVIO_COMMAND_MODES = ["create", "continue", "execute"] as const;
export type RimvioCommandMode = (typeof RIMVIO_COMMAND_MODES)[number];

export type RimvioCommandSurface =
  | "globe"
  | "context"
  | "workspace";

export type RimvioCommandRoute = {
  readonly mode: RimvioCommandMode;
  readonly reason: string;
  readonly verb?: import("@/lib/rimvio-command/action-verb").ActionVerb | null;
  readonly target?: import("@/lib/rimvio-command/resolve-command-target").CommandTarget;
  /** ADR-053 product taxonomy alias (not ActionVerb SSOT). */
  readonly productFamily?: import("@/lib/rimvio-command/product-verb-family").ProductVerbFamily | null;
  /** Deterministic execution leaf before LLM. */
  readonly leafHint?: import("@/lib/rimvio-command/resolve-leaf-hint").CommandLeafHint | null;
  readonly commitPolicy?: import("@/lib/rimvio-command/resolve-leaf-hint").CommandCommitPolicy;
  readonly intentFamily?: import("@/lib/rule-engine/constitution").IntentFamily;
};
