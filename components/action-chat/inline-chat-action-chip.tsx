"use client";

import { useCallback, useState } from "react";
import { MainActionButton } from "@/components/action-chat/main-action-button";
import { AuxActionButton } from "@/components/action-chat/aux-action-button";
import { openSpawnAction } from "@/lib/action-spawn/open-spawn-action";
import { resolveMainActionBrandStyle } from "@/lib/brand/action-brand-style";
import {
  glangoInlineChipBodyClass,
  glangoInlineChipClass,
  glangoInlineChipHeaderClass,
  glangoInlineChipMetaClass,
  glangoInlineChipTitleClass,
} from "@/lib/brand/glango-neon-theme";
import type { InlineChatActionWire } from "@/lib/action-chat/mention-actions/inline-chat-action";
import { buildKakaoMapSearchHref } from "@/lib/resolvers/deep-links";
import { cn } from "@/lib/utils";

import { addResourcePoolItem } from "@/lib/resource-pool/resource-pool-store";
const URL_PATTERN = /^https?:\/\//iu;
const PHONE_PATTERN = /(?:\+?\d[\d\s-]{7,}\d)/u;

type InlineChatActionChipProps = {
  action: InlineChatActionWire;
  onSpawnPrompt?: (uri: string) => void;
  onOpenCapture?: () => void;
  className?: string;
};

function routeClipboardText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  if (URL_PATTERN.test(trimmed)) {
    return trimmed;
  }
  const phone = trimmed.match(PHONE_PATTERN)?.[0]?.replace(/\s+/g, "").replace(/-/g, "");
  if (phone) {
    return `tel:${phone}`;
  }
  return buildKakaoMapSearchHref(trimmed);
}

function saveMemo(text: string): void {
  if (!text.trim()) {
    return;
  }
  addResourcePoolItem({
    repoId: "memos",
    kind: "memo",
    title: text.trim().slice(0, 48),
    body: text.trim(),
  });
}

export function InlineChatActionChip({
  action,
  onSpawnPrompt,
  onOpenCapture,
  className,
}: InlineChatActionChipProps) {
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);

  const openDeeplink = useCallback(
    (deeplink: string) => {
      openSpawnAction({ deeplink, onPrompt: onSpawnPrompt });
    },
    [onSpawnPrompt],
  );

  const handleMain = useCallback(async () => {
    if (action.mainActionKind === "capture") {
      onOpenCapture?.();
      return;
    }
    if (action.mainActionKind === "internal") {
      if (action.featureId === "memo" && action.query) {
        saveMemo(action.query);
        setClipboardHint("리소스풀에 저장했어요.");
      }
      return;
    }
    if (action.mainActionKind === "clipboard") {
      try {
        const text = await navigator.clipboard.readText();
        const routed = routeClipboardText(text);
        if (routed) {
          setClipboardHint(text.slice(0, 60));
          openDeeplink(routed);
          return;
        }
        setClipboardHint("클립보드 내용을 연결할 수 없어요.");
      } catch {
        setClipboardHint("클립보드 접근이 필요해요.");
      }
      return;
    }
    if (action.mainDeeplink) {
      openDeeplink(action.mainDeeplink);
    }
  }, [action, onOpenCapture, openDeeplink]);

  const handleAux = useCallback(
    (auxId: string) => {
      const aux = action.auxActions.find((item) => item.id === auxId);
      if (!aux) {
        return;
      }
      if (aux.deeplink) {
        openDeeplink(aux.deeplink);
      }
    },
    [action.auxActions, openDeeplink],
  );

  const mainBrand = resolveMainActionBrandStyle({
    label: action.mainLabel,
    deeplink: action.mainDeeplink ?? "",
  });

  return (
    <div
      className={cn(glangoInlineChipClass("sm"), className)}
      aria-label={action.displayName}
    >
      <div className={glangoInlineChipHeaderClass}>
        <span className="text-base" aria-hidden>
          {action.icon}
        </span>
        <span className={glangoInlineChipTitleClass}>{action.displayName}</span>
        {action.query ? (
          <span className={glangoInlineChipMetaClass}>{action.query}</span>
        ) : null}
      </div>
      <div className={cn(glangoInlineChipBodyClass, "space-y-2")}>
        {action.summaryLines.length > 0 ? (
          <ul className="space-y-0.5 text-[12px] text-white/68">
            {action.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <MainActionButton
          label={action.mainLabel}
          brand={mainBrand}
          compact
          onClick={() => void handleMain()}
        />
        {action.auxActions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {action.auxActions.map((aux) => (
              <AuxActionButton
                key={aux.id}
                id={aux.id}
                label={aux.label}
                icon={aux.icon}
                onClick={() => handleAux(aux.id)}
              />
            ))}
          </div>
        ) : null}
        {clipboardHint ? (
          <p className="text-[11px] text-white/50">{clipboardHint}</p>
        ) : null}
      </div>
    </div>
  );
}
