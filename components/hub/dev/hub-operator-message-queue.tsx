"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type OperatorQueuedMessage = {
  readonly id: string;
  readonly text: string;
  readonly at: number;
  readonly contextFileCount: number;
};

type HubOperatorMessageQueueProps = {
  readonly queue: readonly OperatorQueuedMessage[];
  readonly showActions: boolean;
  readonly onKeepQueuing: () => void;
  readonly onSendImmediately: () => void;
  readonly onStop: () => void;
  readonly onReview: (message: OperatorQueuedMessage) => void;
  readonly className?: string;
};

/** Cursor-style queued message panel while Operator is busy. */
export function HubOperatorMessageQueue({
  queue,
  showActions,
  onKeepQueuing,
  onSendImmediately,
  onStop,
  onReview,
  className,
}: HubOperatorMessageQueueProps) {
  const [expanded, setExpanded] = useState(true);
  const [filesExpanded, setFilesExpanded] = useState(false);

  useEffect(() => {
    if (queue.length > 0) {
      setExpanded(true);
    }
  }, [queue.length]);

  if (queue.length === 0) return null;

  const countLabel = queue.length === 1 ? "1 Queued Message" : `${queue.length} Queued Messages`;
  const totalFiles = queue.reduce((sum, item) => sum + item.contextFileCount, 0);

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm",
        className,
      )}
    >
      {showActions ? (
        <div className="flex items-center justify-end gap-2 border-b border-[#f3f4f6] px-2.5 py-2">
          <button
            type="button"
            onClick={onKeepQueuing}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
          >
            Keep Queuing
          </button>
          <button
            type="button"
            onClick={onSendImmediately}
            className="rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-violet-700"
          >
            Send Immediately
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-[11px] font-medium text-[#374151] hover:bg-[#fafafa]"
      >
        {expanded ? <ChevronDown className="size-3.5 text-[#9ca3af]" /> : <ChevronRight className="size-3.5 text-[#9ca3af]" />}
        {countLabel}
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-[#f3f4f6] px-2.5 py-2">
          {queue.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <Circle className="mt-0.5 size-3 shrink-0 text-[#d1d5db]" strokeWidth={2.5} />
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-[#6b7280]">{item.text}</p>
            </div>
          ))}

          {totalFiles > 0 ? (
            <button
              type="button"
              onClick={() => setFilesExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-medium text-[#9ca3af] hover:text-[#6b7280]"
            >
              {filesExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              {totalFiles} Files
            </button>
          ) : null}

          {filesExpanded && totalFiles > 0 ? (
            <p className="pl-4 text-[10px] text-[#9ca3af]">
              Platform workspace context · {totalFiles} tracked change{totalFiles === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-[#f3f4f6] px-2.5 py-2">
        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#6b7280] hover:text-red-600"
        >
          Stop
          <kbd className="rounded border border-[#e5e7eb] bg-[#fafafa] px-1 py-0.5 font-mono text-[9px] text-[#9ca3af]">
            Ctrl+Shift+⌫
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => {
            const first = queue[0];
            if (first) onReview(first);
          }}
          className="rounded-md border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1 text-[10px] font-semibold text-[#374151] hover:bg-white"
        >
          Review
        </button>
      </div>
    </div>
  );
}

export function createOperatorQueuedMessage(
  text: string,
  contextFileCount: number,
): OperatorQueuedMessage {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    at: Date.now(),
    contextFileCount,
  };
}
