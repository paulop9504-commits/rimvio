/**
 * Rimvio Runtime Protocol — Dev implements; Core routes (ADR-062).
 * @see docs/RIMVIO_CORE_OS.md
 */

export type RimvioRuntimeAction = {
  readonly toolId: string;
  readonly capabilityId?: string;
  readonly input: Record<string, unknown>;
  readonly approvalPolicy: "none" | "user_required" | "field_commit";
};

export type RimvioRuntimeObservation = {
  readonly ok: boolean;
  readonly output?: Record<string, unknown>;
  readonly errorKo?: string;
  readonly requiresApproval?: boolean;
  readonly failed?: boolean;
};

export type RimvioRuntimeSurface =
  | "filesystem"
  | "terminal"
  | "browser"
  | "git"
  | "network"
  | "process"
  | "context"
  | "permission";

/** Contract every Hub-published Runtime must satisfy. */
export type RimvioRuntimeProtocol = {
  readonly runtimeId: string;
  readonly standardVersion: string;
  execute(action: RimvioRuntimeAction): Promise<RimvioRuntimeObservation>;
  observe(scope?: { paths?: readonly string[] }): Promise<RimvioRuntimeObservation>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
  supportedSurfaces(): readonly RimvioRuntimeSurface[];
};

export const RIMVIO_RUNTIME_PROTOCOL_VERSION = "1.0" as const;

export const RIMVIO_CORE_RUNTIME_SURFACES: readonly RimvioRuntimeSurface[] = [
  "filesystem",
  "terminal",
  "browser",
  "git",
  "network",
  "process",
  "context",
  "permission",
] as const;
