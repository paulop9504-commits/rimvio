/**
 * P10–12 — Developer mode polish + Computer Use skeleton.
 */

export type DevModeSurface = "workspace" | "terminal" | "preview" | "browser";

export type DevModeLayout = {
  readonly surfaces: readonly DevModeSurface[];
  readonly showFileTree: boolean;
  readonly showActivity: boolean;
  readonly showTerminal: boolean;
};

/** Resolve which dev surfaces to show for current platform state. */
export function resolveDevModeLayout(input: {
  readonly hasPlatform: boolean;
  readonly agentRunning: boolean;
  readonly previewActive: boolean;
}): DevModeLayout {
  return {
    surfaces: input.previewActive
      ? (["workspace", "preview", "browser"] as const)
      : input.agentRunning
        ? (["workspace", "terminal"] as const)
        : (["workspace"] as const),
    showFileTree: input.hasPlatform,
    showActivity: true,
    showTerminal: input.agentRunning,
  };
}

export type ComputerUseActionKind = "navigate" | "click" | "type" | "screenshot" | "wait";

export type ComputerUseAction = {
  readonly id: string;
  readonly kind: ComputerUseActionKind;
  readonly target?: string;
  readonly value?: string;
  readonly detailKo: string;
};

export type ComputerUsePlan = {
  readonly goal: string;
  readonly actions: readonly ComputerUseAction[];
  readonly status: "planned" | "blocked";
  readonly blockReasonKo?: string;
};

/** Skeleton Computer Use planner — blocked until browser runtime wired (P12). */
export function planComputerUse(goal: string): ComputerUsePlan {
  const lower = goal.toLowerCase();
  if (/preview|미리보기|browser|브라우저/.test(lower)) {
    return {
      goal,
      status: "planned",
      actions: [
        { id: "cu-1", kind: "navigate", target: "/hub/workspace?pane=ade", detailKo: "Preview pane 열기" },
        { id: "cu-2", kind: "screenshot", detailKo: "Preview 화면 캡처" },
        { id: "cu-3", kind: "wait", value: "500", detailKo: "렌더 대기" },
      ],
    };
  }

  return {
    goal,
    status: "blocked",
    actions: [],
    blockReasonKo: "Computer Use — browser runtime 미연결 (P12)",
  };
}
