"use client";

import { Loader2 } from "lucide-react";
import { ConfirmActionCard } from "@/components/action-chat/confirm-action-card";
import { ConfirmInterruptCard } from "@/components/action-chat/confirm-interrupt-card";
import { FlushResultStrip } from "@/components/action-chat/flush-result-strip";
import { ThoughtBubble } from "@/components/action-chat/thought-bubble";
import { ActionChatGrid } from "@/components/action-chat/action-grid";
import { AiChatBubble, ContainerEnter, UserChatBubble } from "@/components/action-chat/chat-bubble";
import { ContainerCard } from "@/components/action-chat/container-card";
import {
  ConfirmRevealButtons,
  MagicActionTrigger,
  RevealedActionGrid,
} from "@/components/action-chat/magic-action-ui";
import { OrchestratorMetaStrip } from "@/components/action-chat/orchestrator-meta-strip";
import { TransportLiveCardView } from "@/components/action-chat/transport-live-card";
import { ActionCountdownStrip } from "@/components/action-chat/action-countdown-strip";
import { resolveActionDatetimeIso } from "@/lib/action-chat/action-countdown";
import {
  isActionContainerMessage,
  resolveContainerPresentation,
} from "@/lib/action-chat/container-presentation";
import { resolveActionOfferUx } from "@/lib/action-chat/trust-disclosure";
import { useActionTrust } from "@/hooks/use-action-trust";
import { useNavSectorPicker } from "@/hooks/use-nav-sector-picker";
import { cleanFeedActionLabel } from "@/lib/feed/feed-display";
import { runFeedLinkAction } from "@/lib/feed/run-feed-link-action";
import { chatActionLink } from "@/lib/action-chat/chat-link-stub";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { LinkActionItem, LinkRow } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/types";
import type { Copy } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

type ActionChatMessageListProps = {
  messages: ActionChatMessage[];
  activeLink?: LinkRow | null;
  locale: AppLocale;
  copy: Copy;
  onRevealActions?: (messageId: string) => void;
  onRevealAlternateActions?: (messageId: string) => void;
  onConfirmPlace?: (messageId: string) => void;
  onCorrectPlace?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  onWittyAction?: (messageId: string, action: string) => void;
  onResumeConfirmInterrupt?: (messageId: string) => void;
  onCancelConfirmInterrupt?: (messageId: string) => void;
  className?: string;
};

function AssistantOfferMessage({
  message,
  locale,
  onRevealActions,
  onRevealAlternateActions,
  onConfirmPlace,
  onCorrectPlace,
  onWittyAction,
  onResumeConfirmInterrupt,
  onCancelConfirmInterrupt,
  onAction,
}: {
  message: ActionChatMessage;
  locale: AppLocale;
  onRevealActions?: (messageId: string) => void;
  onRevealAlternateActions?: (messageId: string) => void;
  onConfirmPlace?: (messageId: string) => void;
  onCorrectPlace?: (messageId: string, suggestion: import("@/lib/action-chat/confirmation-types").LocationSuggestion) => void;
  onWittyAction?: (messageId: string, action: string) => void;
  onResumeConfirmInterrupt?: (messageId: string) => void;
  onCancelConfirmInterrupt?: (messageId: string) => void;
  onAction: (action: LinkActionItem) => void;
}) {
  useActionTrust();
  const primary = message.actions?.[0];
  const secondary = message.actions?.slice(1) ?? [];
  const confidence = message.confidence ?? 0.85;
  const userRevealed = message.actionsRevealed ?? false;
  const presentation = resolveContainerPresentation(message);
  const isContainer = isActionContainerMessage(message);

  const thoughtText = message.thought ?? message.confirmation?.thought;
  const actionTargetIso = resolveActionDatetimeIso({
    extracted: message.scheduleExtract ?? message.confirmation?.extracted_data,
    batchPending: message.confirmation?.batch_pending,
  });

  const isScheduledPending = message.scheduledDelivery?.status === "pending";

  const isInteractionCard =
    (message.confirmation?.meta?.intent === "CONFIRM" ||
      message.confirmation?.meta?.intent === "WITTY") &&
    !message.actions?.length;

  const ux = resolveActionOfferUx({
    confidence,
    actionsRevealed: userRevealed,
    hasActions: Boolean(primary),
    loading: message.loading,
  });

  if (isScheduledPending) {
    return (
      <div className="space-y-2">
        <AiChatBubble>{message.text}</AiChatBubble>
        {thoughtText ? (
          <div className="px-5">
            <ThoughtBubble text={thoughtText} />
          </div>
        ) : null}
        <ContainerEnter>
          <ContainerCard
            icon={presentation.icon}
            title={message.scheduleExtract?.place_name ?? presentation.title}
            body="캘린더에 넣어뒀어요. 시간되면 길찾기를 꺼낼게요."
            chips={presentation.chips}
            loading={message.loading}
            meta={
              actionTargetIso ? (
                <ActionCountdownStrip targetIso={actionTargetIso} phase="scheduled" />
              ) : null
            }
            footer={null}
          />
        </ContainerEnter>
      </div>
    );
  }

  if (isInteractionCard) {
    const personaMessage =
      message.confirmation?.persona_message ?? message.text;

    return (
      <div className="space-y-2">
        <AiChatBubble>
          {message.loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#4A90E2]" />
              {personaMessage}
            </span>
          ) : (
            personaMessage
          )}
        </AiChatBubble>

        {thoughtText ? (
          <div className="px-5">
            <ThoughtBubble text={thoughtText} />
          </div>
        ) : null}

        <ContainerEnter>
          <ContainerCard
            icon={presentation.icon}
            title={presentation.title}
            body={presentation.body}
            chips={presentation.chips}
            loading={message.loading}
            meta={
              <div className="space-y-2">
                {message.confirmation?.interrupt?.awaiting_choice ? (
                  <ConfirmInterruptCard
                    userMessage={message.confirmation.interrupt.user_message}
                    onResume={() => onResumeConfirmInterrupt?.(message.id)}
                    onCancel={() => onCancelConfirmInterrupt?.(message.id)}
                  />
                ) : null}
                <ConfirmActionCard
                  dataPrompt={message.confirmation?.confirm_message}
                  extracted={message.confirmation?.extracted_data}
                  batchPending={message.confirmation?.batch_pending}
                  wittyButtons={message.confirmation?.witty_buttons}
                  onAccept={() => onConfirmPlace?.(message.id)}
                  onReject={() => undefined}
                  onSelectLocation={(suggestion) =>
                    onCorrectPlace?.(message.id, suggestion)
                  }
                  onWittyAction={(action) => onWittyAction?.(message.id, action)}
                />
                {message.flushReport ? (
                  <FlushResultStrip report={message.flushReport} />
                ) : null}
              </div>
            }
            footer={null}
          />
        </ContainerEnter>
      </div>
    );
  }

  if (!isContainer) {
    return (
      <AiChatBubble>
        {message.loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-[#4A90E2]" />
            {message.text}
          </span>
        ) : (
          <div className="space-y-2">
            {thoughtText ? <ThoughtBubble text={thoughtText} /> : null}
            <div>{message.text}</div>
          </div>
        )}
      </AiChatBubble>
    );
  }

  return (
    <ContainerEnter>
      <ContainerCard
        icon={presentation.icon}
        title={presentation.title}
        body={presentation.body}
        chips={presentation.chips}
        loading={message.loading}
        meta={
          <div className="space-y-2">
            {thoughtText ? <ThoughtBubble text={thoughtText} /> : null}
            {message.confirmation?.interrupt?.awaiting_choice ? (
              <ConfirmInterruptCard
                userMessage={message.confirmation.interrupt.user_message}
                onResume={() => onResumeConfirmInterrupt?.(message.id)}
                onCancel={() => onCancelConfirmInterrupt?.(message.id)}
              />
            ) : null}
            {ux.showConfirmPrompt ? (
              <ConfirmRevealButtons
                onConfirm={() => onRevealActions?.(message.id)}
                onAlternate={() => onRevealAlternateActions?.(message.id)}
                showAlternate={(message.actions?.length ?? 0) > 1}
              />
            ) : null}
            {ux.offerAutoRun ? (
              <p className="text-[11px] font-medium text-[#4A90E2]/80">
                자동 실행 준비됨 · 1순위 버튼을 탭하세요
              </p>
            ) : null}
            <OrchestratorMetaStrip message={message} />
            {message.flushReport ? (
              <FlushResultStrip report={message.flushReport} />
            ) : null}
          </div>
        }
        footer={
          !message.loading ? (
            <div className="space-y-2">
              {message.transportLive ? (
                <TransportLiveCardView
                  card={message.transportLive}
                  actions={message.actions ?? []}
                  onAction={onAction}
                  embedded
                />
              ) : null}

              {ux.showMagicPulse ? (
                <MagicActionTrigger onClick={() => onRevealActions?.(message.id)} />
              ) : null}

              {primary && !message.transportLive ? (
                <RevealedActionGrid open={ux.showActionGrid}>
                  <ActionChatGrid
                    primary={primary}
                    primaryLabel={cleanFeedActionLabel(primary.label, locale)}
                    secondary={secondary}
                    locale={locale}
                    layout="horizontal"
                    emphasizePrimary={ux.emphasizePrimary}
                    onPrimary={() => onAction(primary)}
                    onAction={onAction}
                  />
                </RevealedActionGrid>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1 py-1 text-[13px] text-[#6B7280]">
              <Loader2 className="size-4 animate-spin text-[#4A90E2]" />
              {message.text}
            </div>
          )
        }
      />
    </ContainerEnter>
  );
}

export function ActionChatMessageList({
  messages,
  activeLink = null,
  locale,
  copy,
  onRevealActions,
  onRevealAlternateActions,
  onConfirmPlace,
  onCorrectPlace,
  onWittyAction,
  onResumeConfirmInterrupt,
  onCancelConfirmInterrupt,
  className,
}: ActionChatMessageListProps) {
  const { requestNavSector, shouldOpenNavSector, navSectorSheet } = useNavSectorPicker({
    copy,
    resolveLink: () => chatActionLink(activeLink),
  });

  const handleAction = (action: LinkActionItem) => {
    if (shouldOpenNavSector(action)) {
      requestNavSector(action, activeLink);
      return;
    }

    void runFeedLinkAction(action, chatActionLink(activeLink), copy);
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <>
      <div className={cn("space-y-5 px-4 pb-6 pt-2", className)}>
        {messages.map((message) => {
          if (message.role === "user") {
            return (
              <div key={message.id} data-message-id={message.id}>
                <UserChatBubble>{message.text}</UserChatBubble>
              </div>
            );
          }

          return (
            <div key={message.id} data-message-id={message.id}>
              <AssistantOfferMessage
                message={message}
                locale={locale}
                onRevealActions={onRevealActions}
                onRevealAlternateActions={onRevealAlternateActions}
                onConfirmPlace={onConfirmPlace}
                onCorrectPlace={onCorrectPlace}
                onWittyAction={onWittyAction}
                onResumeConfirmInterrupt={onResumeConfirmInterrupt}
                onCancelConfirmInterrupt={onCancelConfirmInterrupt}
                onAction={handleAction}
              />
            </div>
          );
        })}
      </div>
      {navSectorSheet}
    </>
  );
}
