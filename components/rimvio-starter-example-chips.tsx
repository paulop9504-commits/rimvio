"use client";

import {
  GlobeActionPillGuide,
  readPillSubmitText,
} from "@/components/globe/globe-action-pill-guide";
import { useCopy } from "@/hooks/use-copy";
import { dispatchOpenCaptureSheet } from "@/lib/nav/open-capture-sheet-bridge";
import type { GlobeChatActionHintPill } from "@/lib/portal/compose-draft/build-globe-chat-action-hint";
import { cn } from "@/lib/utils";

type RimvioStarterExampleChipsProps = {
  className?: string;
  onPillSelect?: (pill: GlobeChatActionHintPill) => void;
};

/** 첫 실행·빈 화면 — 탭 한 번으로 ＋ 캡처에 예시 문장 넣기 */
export function RimvioStarterExampleChips({
  className,
  onPillSelect,
}: RimvioStarterExampleChipsProps) {
  const copy = useCopy();
  const pills = copy.starterExamples.personal;

  return (
    <GlobeActionPillGuide
      bodyKo={copy.starterExamples.sectionLabel}
      pills={pills}
      variant="inline"
      tone="light"
      showLabel={false}
      className={cn(className)}
      onPillSelect={
        onPillSelect ??
        ((pill) => {
          dispatchOpenCaptureSheet({
            seedText: readPillSubmitText(pill),
            source: "coach",
          });
        })
      }
    />
  );
}
