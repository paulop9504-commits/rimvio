"use client";

import { GlobeTypewriterText } from "@/components/globe/globe-typewriter-text";
import { GlobeScoutFeedGateComposeCard } from "@/components/globe/globe-scout-feed-gate-compose-card";
import { ContextWorkspacePreviewCard } from "@/components/context-workspace/context-workspace-preview-card";
import { WorkspaceSdkPrepCard } from "@/components/workspace-sdk/workspace-sdk-prep-card";
import { GlobeContextScoutResultCard } from "@/components/globe/globe-context-scout-result-card";
import { GlobeLodgingRoomCardList } from "@/components/globe/globe-lodging-room-card-list";
import { GlobeIntakeSlotsComposeCard } from "@/components/globe/intake/globe-intake-slots-compose-card";
import { GlobeOperatorAskChipsComposeCard } from "@/components/globe/globe-operator-ask-chips-compose-card";
import { GlobeIntentExecutionTimeline } from "@/components/globe/globe-intent-execution-timeline";
import { GlobeScoutNarrationStream } from "@/components/globe/globe-scout-narration-stream";
import type { ContextAgentComposeTurn } from "@/lib/globe/assistant";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextConditionPinnedByKind } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { resolveLodgingRoomCardStep } from "@/lib/globe/hub-checkout/resolve-lodging-hub-checkout-session";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  rimvioAssistantAiBubbleClass,
  rimvioAssistantMetaClass,
  rimvioAssistantTypewriterCursorClass,
  rimvioAssistantUserBubbleClass,
} from "@/lib/design/globe-assistant-surface";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeAssistantComposeThreadProps = {
  turns: readonly ContextAgentComposeTurn[];
  className?: string;
  typewriterTurnId?: string | null;
  onTypewriterComplete?: () => void;
  pinnedByKind?: ContextConditionPinnedByKind;
  pickBusyPlaceId?: string | null;
  onPickRecommendation?: (item: ContextConditionRecommendation) => void;
  contextEventId?: string | null;
  onOpenIdentitySettings?: () => void;
  onIntakeSubmit?: (input: {
    turnId: string;
    domainId: string;
    values: Record<string, string | number>;
  }) => void;
  onAskChipPick?: (input: {
    turnId: string;
    chipId: string;
    gapId: string;
    value: string;
    labelKo: string;
    pendingTrigger: string;
  }) => void;
  onOpenScoutFeed?: (input: { turnId: string; batchId: string }) => void;
  onScoutDomainCorrection?: (input: {
    turnId: string;
    batchId: string;
    chipId: string;
  }) => void;
  scoutFeedGateBusy?: boolean;
};

/** Cursor-style thread — talk left, globe-apply right as diff line. */
export function GlobeAssistantComposeThread({
  turns,
  className,
  typewriterTurnId = null,
  onTypewriterComplete,
  pinnedByKind = {
    lodging: null,
    eatery: null,
    activity: null,
    amenity: null,
  },
  pickBusyPlaceId = null,
  onPickRecommendation,
  contextEventId = null,
  onOpenIdentitySettings,
  onIntakeSubmit,
  onAskChipPick,
  onOpenScoutFeed,
  onScoutDomainCorrection,
  scoutFeedGateBusy = false,
}: GlobeAssistantComposeThreadProps) {
  if (turns.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-2", className)}
      data-globe-assistant-compose-thread
    >
      {turns.map((turn) => {
        if (turn.role === "user") {
          return (
            <div key={turn.id} className="flex justify-end">
              <p
                className={cn(
                  rimvioAssistantUserBubbleClass("max-w-[88%] text-[13px]"),
                  "bg-[#e8e8ed] text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]",
                )}
              >
                {turn.text}
              </p>
            </div>
          );
        }

        if (turn.kind === "build_log") {
          return (
            <div key={turn.id} className="flex justify-start">
              <p
                className="max-w-[88%] rounded-lg bg-[#0b0b0f]/[0.05] px-2.5 py-1 font-mono text-[11px] leading-relaxed text-[#515154] ring-1 ring-black/[0.04]"
                data-globe-assistant-build-log
              >
                <span className="text-[#0071e3]">&gt;</span> {turn.text}
              </p>
            </div>
          );
        }

        if (turn.kind === "scout_narration") {
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeScoutNarrationStream payload={turn.payload} />
            </div>
          );
        }

        if (turn.kind === "execution_timeline") {
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeIntentExecutionTimeline payload={turn.payload} />
            </div>
          );
        }

        if (turn.kind === "globe_apply") {
          return (
            <div key={turn.id} className="flex justify-start">
              <p
                className={cn(
                  rimvioAssistantMetaClass(
                    "max-w-[88%] rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[11px] font-medium text-[#0071e3]",
                  ),
                )}
                data-globe-assistant-globe-apply
              >
                {copy.globe.globeComposeGlobeApplyPrefix} {turn.text}
              </p>
            </div>
          );
        }

        if (turn.kind === "scout_feed_gate") {
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeScoutFeedGateComposeCard
                summaryKo={turn.payload.summaryKo}
                count={turn.payload.count}
                opened={turn.payload.status === "opened"}
                superseded={turn.payload.status === "superseded"}
                busy={scoutFeedGateBusy}
                aiInsightKo={turn.payload.aiInsightKo}
                tipsKo={turn.payload.tipsKo}
                highlightTitles={turn.payload.highlightTitles}
                videoContext={turn.payload.videoContext}
                correctionChips={turn.payload.correctionChips}
                onConfirm={() =>
                  onOpenScoutFeed?.({
                    turnId: turn.id,
                    batchId: turn.payload.batchId,
                  })
                }
                onCorrectionChip={
                  onScoutDomainCorrection
                    ? (chipId) =>
                        onScoutDomainCorrection({
                          turnId: turn.id,
                          batchId: turn.payload.batchId,
                          chipId,
                        })
                    : undefined
                }
              />
            </div>
          );
        }

        if (turn.kind === "workspace_preview" && contextEventId) {
          return (
            <div key={turn.id} className="flex justify-start max-w-[96%]">
              <ContextWorkspacePreviewCard
                contextEventId={contextEventId}
                payload={turn.payload}
              />
            </div>
          );
        }

        if (turn.kind === "workspace_sdk") {
          return (
            <div key={turn.id} className="flex justify-start max-w-[96%]">
              <WorkspaceSdkPrepCard frame={turn.payload.frame} />
            </div>
          );
        }

        if (turn.kind === "scout_cards") {
          const items: ContextConditionRecommendation[] = turn.payload.recommendations.map(
            (row, index) => ({
              kind: row.kind,
              activitySubtype:
                row.activitySubtype as ContextConditionRecommendation["activitySubtype"],
              title: row.title,
              reasonKo: row.reasonKo,
              rank: index + 1,
              placeId: row.placeId,
              lat: row.lat,
              lng: row.lng,
            }),
          );
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeContextScoutResultCard
                summaryKo={turn.payload.summaryKo}
                items={items}
                pinnedByKind={pinnedByKind}
                pickBusyPlaceId={pickBusyPlaceId}
                onPick={onPickRecommendation}
              />
            </div>
          );
        }

        if (turn.kind === "intake_slots") {
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeIntakeSlotsComposeCard
                turnId={turn.id}
                hint={turn.text}
                payload={turn.payload}
                onSubmit={onIntakeSubmit}
              />
            </div>
          );
        }

        if (turn.kind === "ask_chips") {
          return (
            <div key={turn.id} className="flex justify-start">
              <GlobeOperatorAskChipsComposeCard
                turnId={turn.id}
                hint={turn.text}
                payload={turn.payload}
                onPickChip={onAskChipPick}
              />
            </div>
          );
        }

        if (turn.kind === "lodging_room_cards" && contextEventId) {
          const event = findLifeEventCandidate(contextEventId);
          const step = event
            ? resolveLodgingRoomCardStep(event, turn.payload.placeId)
            : null;
          if (!step) {
            return null;
          }
          return (
            <div key={turn.id} className="flex justify-start max-w-[92%]">
              <GlobeLodgingRoomCardList
                contextEventId={step.contextEventId}
                resourceId={step.resourceId}
                payload={step.payload}
                onOpenIdentitySettings={onOpenIdentitySettings}
              />
            </div>
          );
        }

        const useTypewriter = typewriterTurnId === turn.id;
        return (
          <div key={turn.id} className="flex justify-start">
            <p className={rimvioAssistantAiBubbleClass("max-w-[88%] text-[13px]")}>
              {useTypewriter ? (
                <GlobeTypewriterText
                  text={turn.text}
                  cps={46}
                  onComplete={onTypewriterComplete}
                  cursorClassName={rimvioAssistantTypewriterCursorClass()}
                />
              ) : (
                turn.text
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
