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
    <p className="text-[12px] text-[#64748B]">
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
  onBack,
  onSaveDraft,
  onNext,
  onPublish,
  nextDisabled,
  publishDisabled,
  nextLoading,
  publishLoading,
}: {
  currentStep: number;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onPublish: () => void;
  nextDisabled?: boolean;
  publishDisabled?: boolean;
  nextLoading?: boolean;
  publishLoading?: boolean;
}) {
  const isLast = currentStep === 6;
  return (
    <footer className="sticky bottom-0 z-10 flex items-center justify-between border-t border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur-sm lg:px-6">
      <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={currentStep === 1}>
        Back
      </Button>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onSaveDraft}>
          Save Draft
        </Button>
        {isLast ? (
          <Button
            type="button"
            size="sm"
            disabled={publishDisabled || publishLoading}
            onClick={onPublish}
            className={cn("bg-[#6366F1] hover:bg-[#4F46E5]")}
          >
            {publishLoading ? "Publishing…" : "Publish Capability"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={nextDisabled || nextLoading}
            onClick={onNext}
            className="bg-[#6366F1] hover:bg-[#4F46E5]"
          >
            {nextLoading ? "Validating…" : "Save & Next →"}
          </Button>
        )}
      </div>
    </footer>
  );
}
