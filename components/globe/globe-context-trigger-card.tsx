"use client";

import type { ReactNode } from "react";
import { GlobeContextTriggerMediaStack } from "@/components/globe/globe-context-trigger-media-stack";
import type { GlobeContextTriggerMediaPreview } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import { cn } from "@/lib/utils";
import { RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";

export type GlobeContextTriggerCardProps = {
  emoji: string;
  title: string;
  body: string;
  ctaLabel: string;
  mediaPreviews?: readonly GlobeContextTriggerMediaPreview[];
  focused?: boolean;
  footer?: ReactNode;
  onPress: () => void;
  className?: string;
};

export function GlobeContextTriggerCard({
  emoji,
  title,
  body,
  ctaLabel,
  mediaPreviews,
  focused = false,
  footer,
  onPress,
  className,
}: GlobeContextTriggerCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "flex min-w-[11.75rem] max-w-[13.5rem] shrink-0 flex-col rounded-2xl px-3.5 py-3 text-left transition-transform active:scale-[0.98]",
        focused
          ? "bg-white shadow-[0_8px_28px_rgba(2,32,71,0.14)] ring-2 ring-primary/35"
          : "bg-white/95 shadow-sm ring-1 ring-black/[0.06]",
        className,
      )}
      data-globe-context-trigger-card
      data-globe-context-trigger-focused={focused ? "true" : "false"}
      data-globe-context-trigger-has-media={mediaPreviews?.length ? "true" : "false"}
    >
      <GlobeContextTriggerMediaStack emoji={emoji} media={mediaPreviews} />
      <span className={cn("mt-2 line-clamp-2", RIMVIO_TYPE.body, "text-[14px] font-semibold leading-snug")}>
        {title}
      </span>
      <span className={cn("mt-1 line-clamp-2", RIMVIO_TYPE.caption, "text-[12px] leading-snug text-muted-foreground")}>
        {body}
      </span>
      <span className="mt-2.5 text-[11px] font-medium text-muted-foreground">
        {ctaLabel}
      </span>
      {footer ? <div className="mt-2 w-full">{footer}</div> : null}
    </button>
  );
}
