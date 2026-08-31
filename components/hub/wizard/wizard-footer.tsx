"use client";

import { Button } from "@/components/ui/button";
import type { AutosaveStatus } from "@/lib/hub/capability/types";
import { cn } from "@/lib/utils";

function formatSavedAt(date: Date | null): string {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Saved just now";
  return `Draft saved ${Math.floor(diff / 60)} min ago`;
}

export function AutosaveStatusBar({
  status,
  lastSavedAt,
  onRetry,
}: {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  onRetry?: () => void;
}) {
  return (
    <p className="text-[12px] text-[#94A3B8]">
      {status === "saving" && "Saving…"}
      {status === "saved" && formatSavedAt(lastSavedAt)}
      {status === "error" && (
        <>
          Unable to save.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-[#6366F1]">
            Retry
          </button>
        </>
      )}
      {status === "idle" && lastSavedAt ? formatSavedAt(lastSavedAt) : null}
    </p>
  );
}

export function WizardFooter({
  currentStep,
  totalSteps = 6,
  onBack,
  onSaveDraft,
  onNext,
  onPublish,
  onRunTestAgain,
  nextDisabled,
  publishDisabled,
  nextLoading,
  publishLoading,
  publishLabel = "Submit for Review",
}: {
  currentStep: number;
  totalSteps?: number;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onPublish: () => void;
  onRunTestAgain?: () => void;
  nextDisabled?: boolean;
  publishDisabled?: boolean;
  nextLoading?: boolean;
  publishLoading?: boolean;
  publishLabel?: string;
}) {
  const isLast = currentStep === totalSteps;
  const isFirst = currentStep === 1;

  return (
    <footer className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[#E2E8F0] bg-white px-4 py-3 lg:px-8">
      {!isFirst ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-9 text-[12px]"
        >
          Back
        </Button>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-2">
        {!isFirst ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSaveDraft}
            className="h-9 text-[12px] text-[#64748B]"
          >
            Save Draft
          </Button>
        ) : null}
        {currentStep === 5 && onRunTestAgain ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRunTestAgain}
            className="h-9 text-[12px]"
          >
            Run Test Again
          </Button>
        ) : null}
        {isLast ? (
          <Button
            type="button"
            size="sm"
            disabled={publishDisabled || publishLoading}
            onClick={onPublish}
            className={cn("h-9 bg-[#6366F1] px-5 text-[12px] hover:bg-[#4F46E5]")}
          >
            {publishLoading ? "Submitting…" : publishLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={nextDisabled || nextLoading}
            onClick={onNext}
            className="h-9 bg-[#6366F1] px-5 text-[12px] hover:bg-[#4F46E5]"
          >
            {nextLoading ? "Validating…" : "Save & Next →"}
          </Button>
        )}
      </div>
    </footer>
  );
}
