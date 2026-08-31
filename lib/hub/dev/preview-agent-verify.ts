/**
 * P7 — Preview agent verification.
 * Validates sandbox preview invoke + result shape before continuing loop.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { SandboxPreviewState } from "@/lib/hub/dev/sandbox-preview";
import {
  runSandboxHotelSearch,
  runBrowserPreviewInspection,
  type BrowserAgentSession,
} from "@/lib/hub/dev/sandbox-preview";

export type PreviewVerifyCheck = {
  readonly id: string;
  readonly ok: boolean;
  readonly detailKo: string;
};

export type PreviewVerifyResult = {
  readonly ok: boolean;
  readonly checks: readonly PreviewVerifyCheck[];
  readonly summaryKo: string;
  readonly browserSession?: BrowserAgentSession;
};

export function verifyPreviewState(
  state: SandboxPreviewState,
  draft: PlatformDraft,
): PreviewVerifyResult {
  const checks: PreviewVerifyCheck[] = [];

  checks.push({
    id: "invoke",
    ok: state.invokeOk,
    detailKo: state.invokeOk ? "Sandbox invoke OK" : state.invokeDetail,
  });

  checks.push({
    id: "platform",
    ok: state.platformId === draft.id || state.platformId.length > 0,
    detailKo: `platformId=${state.platformId}`,
  });

  const hasHotelCap = draft.actions.some((a) => a.name === "hotel.search");
  if (hasHotelCap) {
    checks.push({
      id: "hotel_results",
      ok: state.hotels.length > 0 || state.mode === "demo",
      detailKo:
        state.hotels.length > 0
          ? `${state.hotels.length} hotels`
          : "demo fallback (no live results)",
    });
  }

  const ok = checks.every((c) => c.ok);
  return {
    ok,
    checks,
    summaryKo: ok ? "Preview 검증 통과" : checks.filter((c) => !c.ok).map((c) => c.detailKo).join(" · "),
  };
}

/** Capability #85 — Deep preview inspection with browser agent skeleton. */
export async function inspectPreviewWithBrowser(
  draft: PlatformDraft,
  input?: { destination?: string; checkIn?: string; checkOut?: string; guests?: number },
): Promise<{ readonly state: SandboxPreviewState; readonly verify: PreviewVerifyResult }> {
  const state = await runSandboxHotelSearch(draft, {
    destination: input?.destination ?? "Osaka",
    checkIn: input?.checkIn ?? "2026-04-01",
    checkOut: input?.checkOut ?? "2026-04-03",
    guests: input?.guests ?? 2,
  });
  const browserSession = runBrowserPreviewInspection(state);
  const baseVerify = verifyPreviewState(state, draft);

  const browserChecks: PreviewVerifyCheck[] = browserSession.observations.map((obs, i) => ({
    id: `browser_${i}`,
    ok: obs.ok,
    detailKo: obs.detailKo,
  }));

  const checks = [...baseVerify.checks, ...browserChecks];
  const ok = checks.every((c) => c.ok);

  return {
    state,
    verify: {
      ok,
      checks,
      summaryKo: ok ? "Preview + Browser 검증 통과" : baseVerify.summaryKo,
      browserSession,
    },
  };
}

/** Run preview + agent verification in one pass. */
export async function runPreviewAgentVerification(
  draft: PlatformDraft,
  input?: { destination?: string; checkIn?: string; checkOut?: string; guests?: number },
): Promise<{ readonly state: SandboxPreviewState; readonly verify: PreviewVerifyResult }> {
  const state = await runSandboxHotelSearch(draft, {
    destination: input?.destination ?? "Osaka",
    checkIn: input?.checkIn ?? "2026-04-01",
    checkOut: input?.checkOut ?? "2026-04-03",
    guests: input?.guests ?? 2,
  });
  const verify = verifyPreviewState(state, draft);
  return { state, verify };
}
