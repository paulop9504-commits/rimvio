"use client";

import { useEffect, useRef } from "react";
import { useTypewriterText } from "@/hooks/use-typewriter-text";
import { rimvioAssistantTypewriterCursorClass } from "@/lib/design/globe-assistant-surface";
import { cn } from "@/lib/utils";

export type GlobeTypewriterTextProps = {
  text: string;
  className?: string;
  cps?: number;
  enabled?: boolean;
  showCursor?: boolean;
  cursorClassName?: string;
  onComplete?: () => void;
};

/** Shared progressive text reveal — respects prefers-reduced-motion. */
export function GlobeTypewriterText({
  text,
  className,
  cps,
  enabled,
  showCursor = true,
  cursorClassName,
  onComplete,
}: GlobeTypewriterTextProps) {
  const line = text.trim();
  const { displayed, complete } = useTypewriterText(line, { cps, enabled });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
  }, [line]);

  useEffect(() => {
    if (!line || !complete || firedRef.current) {
      return;
    }
    firedRef.current = true;
    onCompleteRef.current?.();
  }, [complete, line]);

  if (!line) {
    return null;
  }

  return (
    <span className={cn(className)} data-globe-typewriter-text>
      {displayed}
      {showCursor && !complete ? (
        <span
          className={cursorClassName ?? rimvioAssistantTypewriterCursorClass()}
          aria-hidden
        />
      ) : null}
    </span>
  );
}
