/**
 * Operator auto-run bridge — system sequencer fires one composed Act
 * after Plan approve / step advance (not free ReAct).
 *
 * Pin-bar claims the Act; if unclaimed briefly, callers may fall back to compose seed.
 */

export const OPERATOR_AUTO_RUN_EVENT = "rimvio:operator-auto-run";

export type OperatorAutoRunDetail = {
  readonly contextEventId: string;
  readonly text: string;
  readonly source: "plan_step_auto_scout" | "ingress_domain_entry" | "scout_retry" | "reject_rescout";
  readonly progressKo?: string | null;
  /**
   * Soft-fill intake on Act (sequencer / ingress) — do not bounce to chips
   * for budget · guests when destination is already known.
   */
  readonly expressReady?: boolean;
};

let pendingClaimKey: string | null = null;
let pendingClaimed = false;

function claimKey(detail: Pick<OperatorAutoRunDetail, "contextEventId" | "text">): string {
  return `${detail.contextEventId.trim()}::${detail.text.trim()}`;
}

export function requestOperatorAutoRun(detail: OperatorAutoRunDetail): void {
  const contextEventId = detail.contextEventId.trim();
  const text = detail.text.trim();
  if (typeof window === "undefined" || !contextEventId || !text) {
    return;
  }
  const expressReady =
    detail.expressReady === true ||
    detail.source === "plan_step_auto_scout" ||
    detail.source === "ingress_domain_entry";
  pendingClaimKey = claimKey({ contextEventId, text });
  pendingClaimed = false;
  window.dispatchEvent(
    new CustomEvent<OperatorAutoRunDetail>(OPERATOR_AUTO_RUN_EVENT, {
      detail: {
        contextEventId,
        text,
        source: detail.source,
        progressKo: detail.progressKo ?? null,
        expressReady,
      },
    }),
  );
}

/** Pin-bar (or other Act owner) acknowledges it will run this seed. */
export function claimOperatorAutoRun(
  detail: Pick<OperatorAutoRunDetail, "contextEventId" | "text">,
): boolean {
  const key = claimKey(detail);
  if (!key || pendingClaimKey !== key || pendingClaimed) {
    return false;
  }
  pendingClaimed = true;
  return true;
}

export function wasOperatorAutoRunClaimed(
  detail: Pick<OperatorAutoRunDetail, "contextEventId" | "text">,
): boolean {
  return pendingClaimed && pendingClaimKey === claimKey(detail);
}

export function subscribeOperatorAutoRun(
  listener: (detail: OperatorAutoRunDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<OperatorAutoRunDetail>).detail;
    const contextEventId = detail?.contextEventId?.trim() ?? "";
    const text = detail?.text?.trim() ?? "";
    if (!contextEventId || !text) {
      return;
    }
    listener({
      contextEventId,
      text,
      source: detail.source ?? "plan_step_auto_scout",
      progressKo: detail.progressKo ?? null,
      expressReady:
        detail.expressReady === true ||
        detail.source === "plan_step_auto_scout" ||
        detail.source === "ingress_domain_entry",
    });
  };
  window.addEventListener(OPERATOR_AUTO_RUN_EVENT, handler);
  return () => window.removeEventListener(OPERATOR_AUTO_RUN_EVENT, handler);
}

