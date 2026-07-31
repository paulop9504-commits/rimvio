/**
 * Workspace Intent Continuum — one tool from Intent → Context → Focus → Booking prep.
 * Does not Reality-Commit. Hotel Focus → booking.prepare → Field → pending_payment → Hub.
 * Marketplace uses the same continuum (ADR-032) — sell/buy Context + Agent, not a listing app.
 * @see docs/adr/024-workspace-kind-prep.md · docs/adr/025-one-intent-workspace-focus.md
 * @see docs/adr/032-marketplace-as-context-type.md
 */

import { copy } from "@/lib/copy/human-ko";
import { appendWorkspacePreviewComposeTurn } from "@/lib/context-workspace/append-workspace-preview-turn";
import { openLodgingContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { ensureTripContextEvent } from "@/lib/experience-run/ensure-trip-context-event";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { appendGlobeChatTextMessage } from "@/lib/globe/chat/globe-chat-session-store";
import { parseMarketProductFromText } from "@/lib/globe/market/parse-market-product-from-text";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { runRealityIngressPipeline } from "@/lib/reality-pipeline";
import { invokeRimvioToolAsync } from "@/lib/tool-registry";
import { buildWorkspaceFocusSurface } from "@/lib/workspace-kind/build-workspace-focus-surface";
import {
  classifyMarketWorkspaceRole,
  classifyWorkspaceKind,
} from "@/lib/workspace-kind/classify-workspace-kind";
import { ensureMarketContextEvent } from "@/lib/workspace-kind/ensure-market-context-event";
import { prepareWorkspaceResources } from "@/lib/workspace-kind/prepare-workspace-resources";
import { usedGoodsFocusSequence } from "@/lib/workspace-kind/templates";
import type {
  WorkspaceFocusSurface,
  WorkspaceKind,
  WorkspacePrepCardModel,
} from "@/lib/workspace-kind/types";
import {
  buildSdkFrameFromPrep,
  workspaceKindToSdkKind,
} from "@/lib/workspace-sdk/from-workspace-kind";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import { appendWorkspaceSdkComposeTurn } from "@/lib/workspace-sdk/append-workspace-sdk-compose-turn";
import { syncTravelSdkFrameAfterLodgingSeed } from "@/lib/workspace-sdk/sync-travel-sdk-after-lodging-seed";
import { seedContextRealityBundle } from "@/lib/reality-os";
import { offerContextReferenceChips } from "@/lib/context-reference/offer-context-reference-chips";

export type WorkspaceIntentContinuumResult = {
  readonly kind: WorkspaceKind;
  readonly contextEventId: string;
  readonly card: WorkspacePrepCardModel;
  readonly focus: WorkspaceFocusSurface;
  readonly workspace: ContextWorkspaceState | null;
  /** Booking/payment path is seeded (inbox + lodging workspace). */
  readonly bookingPathSeeded: boolean;
  /** Canonical six-region frame — UI hosts render this. */
  readonly sdkFrame: WorkspaceSdkFrame;
};

function ensureDriverContextEvent(input: {
  readonly utterance: string;
  readonly existingEventId?: string | null;
}): { readonly id: string; readonly title: string } {
  const existing = input.existingEventId?.trim();
  if (existing) {
    return { id: existing, title: "대리 작업" };
  }
  const event = ensureTripContextEvent({
    message: input.utterance.trim() || "대리 뛸게",
    profile: "leisure_travel",
  });
  return { id: event.id, title: event.title };
}

function marketTitleOverride(utterance: string): string {
  const role = classifyMarketWorkspaceRole(utterance);
  const productRaw = parseMarketProductFromText(utterance).productName;
  const product = isValidMarketProductName(productRaw) ? productRaw.trim() : "";
  if (product) {
    return role === "sell" ? `${product} 판매` : `${product} 구매`;
  }
  return role === "sell"
    ? copy.globe.workspacePrepMarketSellTitle
    : copy.globe.workspacePrepMarketBuyTitle;
}

function openTogetherLine(kind: WorkspaceKind, utterance: string): string {
  if (kind === "travel") {
    return copy.globe.workspaceOpenTogether;
  }
  if (kind === "driver") {
    return copy.globe.workspaceOpenTogetherDriver;
  }
  if (kind === "used_goods") {
    return classifyMarketWorkspaceRole(utterance) === "buy"
      ? copy.globe.workspaceOpenTogetherMarketBuy
      : copy.globe.workspaceOpenTogetherMarket;
  }
  return copy.globe.workspaceOpenTogetherGeneric;
}

/**
 * Attach continuum after Context exists (or mint travel/driver/market context).
 * Sync core; lodging live fill is async optional.
 */
export function runWorkspaceIntentContinuum(input: {
  readonly utterance: string;
  readonly graphId: string;
  readonly contextEventId?: string | null;
  /** Mint context when missing (post-「생성」 or direct driver/market). */
  readonly createIfMissing?: boolean;
  readonly skipChatEcho?: boolean;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): WorkspaceIntentContinuumResult | null {
  const utterance = input.utterance.trim();
  const kind = classifyWorkspaceKind(utterance);
  if (!kind) {
    return null;
  }

  let contextEventId = input.contextEventId?.trim() || "";
  if (!contextEventId) {
    if (!input.createIfMissing) {
      return null;
    }
    if (kind === "travel") {
      const event = ensureTripContextEvent({ message: utterance });
      contextEventId = event.id;
    } else if (kind === "used_goods") {
      const event = ensureMarketContextEvent({ utterance });
      contextEventId = event.id;
    } else {
      const event = ensureDriverContextEvent({ utterance });
      contextEventId = event.id;
    }
  }

  const prepared = prepareWorkspaceResources({
    utterance,
    contextEventId,
    titleOverrideKo:
      kind === "travel"
        ? extractTravelDestination(utterance) ?? undefined
        : kind === "used_goods"
          ? marketTitleOverride(utterance)
          : copy.globe.workspacePrepDriverTitle,
  });
  if (!prepared) {
    return null;
  }

  const marketRole =
    kind === "used_goods" ? classifyMarketWorkspaceRole(utterance) : null;
  const focusSequenceOverride =
    marketRole != null ? usedGoodsFocusSequence(marketRole) : null;

  const focus = buildWorkspaceFocusSurface({
    kind,
    focusSlotId: prepared.card.focusSlotId,
    backgroundSlotIds: kind === "travel" ? ["budget"] : [],
    focusSequenceOverride,
  });

  let bookingPathSeeded = false;
  if (kind === "travel") {
    const dest =
      extractTravelDestination(utterance)?.trim() ||
      prepared.card.titleKo ||
      "여행지";
    runRealityIngressPipeline({
      contextEventId,
      utterance,
      contextLabelKo: prepared.card.titleKo,
      destinationLabelKo: dest,
      seedExecutionInbox: true,
    });
    bookingPathSeeded = true;
  }

  if (!input.skipChatEcho) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: [
        copy.globe.workspaceAgentAutoSetting,
        prepared.card.titleKo,
        focus.headlineKo,
        openTogetherLine(kind, utterance),
      ].join("\n"),
    });
  }

  if (prepared.workspace) {
    appendWorkspacePreviewComposeTurn(contextEventId);
    // Cursor IDE: open Workspace immediately — no 「작업장 열기」tap / Host modal.
    writeContextWorkspaceExpanded(contextEventId, true);
    dispatchContextWorkspaceExpand({
      contextEventId,
      source: "trip_prep",
    });
  }

  seedContextRealityBundle({
    contextEventId,
    sdkKind: workspaceKindToSdkKind(kind),
    focusSlotId: prepared.card.focusSlotId,
  });

  const sdkFrame = buildSdkFrameFromPrep({
    card: prepared.card,
    focus,
  });
  // Keep frame in session for dock/status — do not pop Host approval sheet.
  appendWorkspaceSdkComposeTurn({
    contextEventId,
    frame: sdkFrame,
    openHost: false,
  });

  // Cross-Context (ADR-030): optional link chips — especially market ↔ travel.
  offerContextReferenceChips({
    targetEventId: contextEventId,
    utterance,
    forTargetKind:
      kind === "used_goods"
        ? "used_goods"
        : kind === "travel"
          ? "travel"
          : kind === "driver"
            ? "driver"
            : null,
  });

  return {
    kind,
    contextEventId,
    card: prepared.card,
    focus,
    workspace: prepared.workspace,
    bookingPathSeeded,
    sdkFrame,
  };
}

/**
 * Fill lodging Workspace candidates so Hotel Focus → reserve → Commit → pay is reachable.
 * Never wipe Reality Draft pins (USJ · 도톤보리 · APA) when live lodging is empty.
 */
export async function seedTravelLodgingForContinuum(input: {
  readonly contextEventId: string;
  readonly utterance: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
}): Promise<ContextWorkspaceState | null> {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return null;
  }
  const dest = extractTravelDestination(utterance)?.trim() || "여행지";
  const prev = readContextWorkspace(contextEventId);
  const tool = await invokeRimvioToolAsync("hotel.lookup", {
    query: `${dest} 숙소`,
    utterance,
    contextEventId,
    lat: input.lat,
    lng: input.lng,
    domain: "lodging",
  });
  const raw = tool.candidates ?? [];
  const live = raw.filter((c) => {
    const id = c.id ?? "";
    if (id.startsWith("search:")) return false;
    if (c.source === "seed") return false;
    return true;
  });
  // Live empty → keep Osaka/catalog lodging seeds so Hotel Focus still has candidates.
  const candidates =
    live.length > 0
      ? live
      : raw.filter((c) => {
          const id = c.id ?? "";
          if (id.startsWith("search:")) return false;
          return c.source === "seed" || id.startsWith("lodging:");
        });

  // No new lodging and draft already has places — leave Reality Draft intact.
  if (
    candidates.length === 0 &&
    prev &&
    prev.nodes.some((n) => n.visible)
  ) {
    syncTravelSdkFrameAfterLodgingSeed({
      contextEventId,
      candidateCount: prev.nodes.filter((n) => n.kind === "lodging").length,
      headerTitleKo: dest,
    });
    return prev;
  }

  const workspace = openLodgingContextWorkspace({
    contextEventId,
    query: `${dest} 숙소`,
    summaryKo: copy.globe.workspacePreviewReady(
      Math.max(
        candidates.length,
        prev?.nodes.filter((n) => n.visible).length ?? 0,
      ),
    ),
    candidates,
    source: "trip_prep",
  });
  appendWorkspacePreviewComposeTurn(contextEventId);
  syncTravelSdkFrameAfterLodgingSeed({
    contextEventId,
    candidateCount: workspace.nodes.filter((n) => n.kind === "lodging").length,
    headerTitleKo: dest,
  });
  return workspace;
}
