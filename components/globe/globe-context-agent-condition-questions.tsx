"use client";

import type {
  LocalDiscoveryQuestion,
  LocalDiscoveryQuestionChoice,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { cn } from "@/lib/utils";

export type GlobeContextAgentConditionQuestionsProps = {
  questions: readonly LocalDiscoveryQuestion[];
  onSelect: (choice: LocalDiscoveryQuestionChoice) => void;
  className?: string;
};

/** Condition extraction — AI questions as filter chips (no UI filter panel). */
export function GlobeContextAgentConditionQuestions({
  questions,
  onSelect,
  className,
}: GlobeContextAgentConditionQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-3", className)}
      data-globe-context-agent-questions
    >
      {questions.map((question) => (
        <div key={question.slot} className="space-y-1.5">
          <p className="text-[12px] font-medium leading-snug text-[#1d1d1f]">
            {question.promptKo}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {question.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onSelect(choice)}
                className="rounded-full bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] font-semibold text-[#1d1d1f] ring-1 ring-black/[0.05] active:scale-[0.98] active:bg-[#0071e3]/10 active:text-[#0071e3]"
                data-globe-context-agent-question-choice={choice.id}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
