"use client";

import { useState } from "react";
import { GlangoActionButton } from "@/components/ui/glango-action-button";
import { SmartLocationPicker } from "@/components/action-chat/smart-location-picker";
import { ActionCountdownStrip } from "@/components/action-chat/action-countdown-strip";
import { resolveActionDatetimeIso } from "@/lib/action-chat/action-countdown";
import type {
  BatchPendingItem,
  ConfirmationExtractedData,
  LocationSuggestion,
  WittyButtonWire,
} from "@/lib/action-chat/confirmation-types";

const PLACE_ACCEPT_ACTIONS = new Set(["accept_confirm", "confirm", "confirm_yes", "accept"]);
const PLACE_REJECT_ACTIONS = new Set(["reject_place", "reject", "pick_other", "other_place"]);

type ConfirmActionCardProps = {
  /** Short data-card prompt only — persona lives in chat bubble */
  dataPrompt?: string;
  extracted?: ConfirmationExtractedData | null;
  batchPending?: BatchPendingItem[];
  wittyButtons?: WittyButtonWire[];
  onAccept: () => void;
  onReject: () => void;
  onSelectLocation: (suggestion: LocationSuggestion) => void;
  onWittyAction?: (action: string) => void;
};

export function ConfirmActionCard({
  dataPrompt = "아래 정보로 진행할까요?",
  extracted,
  batchPending,
  wittyButtons,
  onAccept,
  onReject,
  onSelectLocation,
  onWittyAction,
}: ConfirmActionCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hasWittyButtons = Boolean(wittyButtons?.length);
  const showDataPrompt = Boolean(dataPrompt?.trim()) && !hasWittyButtons;
  const actionTargetIso = resolveActionDatetimeIso({ extracted, batchPending });

  const handleWittyClick = (action: string) => {
    if (PLACE_ACCEPT_ACTIONS.has(action)) {
      onAccept();
      return;
    }
    if (PLACE_REJECT_ACTIONS.has(action)) {
      setPickerOpen(true);
      onReject();
      return;
    }
    onWittyAction?.(action);
  };

  return (
    <div className="space-y-3">
      {actionTargetIso && !hasWittyButtons ? (
        <ActionCountdownStrip targetIso={actionTargetIso} phase="confirm" />
      ) : null}

      {showDataPrompt ? (
        <p className="text-[12px] font-medium text-muted-foreground">{dataPrompt}</p>
      ) : null}

      {extracted?.address || extracted?.place_name ? (
        <div className="rounded-xl bg-glango-surface px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            확인할 위치
          </p>
          {extracted.place_name ? (
            <p className="mt-1 text-[14px] font-medium text-foreground">{extracted.place_name}</p>
          ) : null}
          {extracted.address ? (
            <p className="text-[12px] text-muted-foreground">{extracted.address}</p>
          ) : null}
          {extracted.datetime ? (
            <p className="mt-1 text-[12px] text-muted-foreground">
              일정: {extracted.datetime.replace("T", " ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {batchPending && batchPending.length > 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">확인 후 이어서 처리</p>
          <ul className="mt-1 space-y-1">
            {batchPending.map((item) => (
              <li
                key={`${item.type}-${item.summary ?? item.type}`}
                className="text-[12px] text-muted-foreground"
              >
                · {item.summary ?? item.type}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!pickerOpen ? (
        hasWittyButtons ? (
          <div
            className={
              wittyButtons!.length > 2 ? "flex flex-col gap-2" : "grid grid-cols-2 gap-2"
            }
          >
            {wittyButtons!.map((button, index) => (
              <GlangoActionButton
                key={`${button.action}-${button.label}`}
                variant={index === 0 ? "primary" : "secondary"}
                onClick={() => handleWittyClick(button.action)}
              >
                {button.label}
              </GlangoActionButton>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <GlangoActionButton variant="primary" onClick={onAccept}>
              네, 맞습니다
            </GlangoActionButton>
            <GlangoActionButton
              variant="secondary"
              onClick={() => {
                setPickerOpen(true);
                onReject();
              }}
            >
              아니요, 다른 곳
            </GlangoActionButton>
          </div>
        )
      ) : null}

      <SmartLocationPicker
        open={pickerOpen}
        extracted={extracted}
        onSelect={(suggestion) => {
          setPickerOpen(false);
          onSelectLocation(suggestion);
        }}
      />
    </div>
  );
}
