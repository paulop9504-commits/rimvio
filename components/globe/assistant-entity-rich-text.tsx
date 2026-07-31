"use client";

/**
 * Semantic UI — AI prose with Reality Jump entity chips.
 * Tap → Globe fly + ontology / Action Graph (prepare only).
 */

import { useMemo } from "react";
import {
  splitTextWithRealityJumps,
  type RealityJumpTarget,
} from "@/lib/globe/reality-jump";
import { cn } from "@/lib/utils";

export type AssistantEntityRichTextProps = {
  text: string;
  className?: string;
  onRealityJump?: (target: RealityJumpTarget) => void;
};

export function AssistantEntityRichText({
  text,
  className,
  onRealityJump,
}: AssistantEntityRichTextProps) {
  const parts = useMemo(() => splitTextWithRealityJumps(text), [text]);
  const interactive = typeof onRealityJump === "function";

  return (
    <span
      className={cn("whitespace-pre-wrap", className)}
      data-reality-jump-rich-text
    >
      {parts.map((part, i) => {
        if (part.type === "text") {
          return <span key={`t-${i}`}>{part.text}</span>;
        }
        if (!interactive) {
          return (
            <span key={`e-${i}`} className="font-semibold text-[#0071e3]">
              {part.text}
            </span>
          );
        }
        return (
          <button
            key={`e-${i}`}
            type="button"
            className="mx-0.5 inline rounded-md bg-[#e8f3ff] px-1 py-0.5 font-semibold text-[#0071e3] underline decoration-[#0071e3]/35 underline-offset-2 transition hover:bg-[#d6ebff]"
            data-reality-jump-entity
            data-place-id={part.target.placeId}
            title={`${part.target.labelKo} · Reality Jump`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRealityJump(part.target);
            }}
          >
            {part.text}
          </button>
        );
      })}
    </span>
  );
}
