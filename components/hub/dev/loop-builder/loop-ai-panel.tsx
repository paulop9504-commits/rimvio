"use client";

import { Sparkles } from "lucide-react";
import type { LoopGraphPatch } from "@/lib/agent-os/loop-builder/types";

type LoopAiPanelProps = {
  readonly prompt: string;
  readonly onPromptChange: (value: string) => void;
  readonly onGenerate: () => void;
  readonly onAiEdit: () => void;
  readonly pendingPatch: LoopGraphPatch | null;
  readonly onApplyPatch: () => void;
  readonly onDismissPatch: () => void;
};

export function LoopAiPanel(props: LoopAiPanelProps) {
  return (
    <div className="border-b border-[#e5e7eb] bg-white px-3 py-2">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-2 size-3.5 shrink-0 text-violet-500" />
        <div className="min-w-0 flex-1">
          <textarea
            value={props.prompt}
            onChange={(e) => props.onPromptChange(e.target.value)}
            rows={2}
            placeholder="재고를 확인하고 재고가 있으면 결제를 진행해. 결제 실패하면 3번까지 다시 시도하고, 계속 실패하면 사용자에게 알려줘."
            className="w-full resize-none rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-2.5 py-1.5 text-[10px] text-[#111827] outline-none focus:border-violet-300"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={props.onGenerate}
              className="rounded-md bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white hover:bg-violet-700"
            >
              Generate Graph
            </button>
            <button
              type="button"
              onClick={props.onAiEdit}
              className="rounded-md border border-[#e5e7eb] bg-white px-2.5 py-1 text-[9px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
            >
              AI Edit
            </button>
          </div>
        </div>
      </div>

      {props.pendingPatch ? (
        <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/80 p-2.5">
          <p className="text-[9px] font-semibold text-violet-800">AI suggested changes</p>
          <p className="mt-0.5 text-[9px] text-violet-700">{props.pendingPatch.summaryKo}</p>
          <ul className="mt-1 space-y-0.5">
            {props.pendingPatch.changes.map((c) => (
              <li key={c.label} className="text-[9px] text-[#374151]">
                + {c.label}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={props.onApplyPatch}
              className="rounded-md bg-violet-600 px-2.5 py-1 text-[9px] font-semibold text-white"
            >
              Apply Changes
            </button>
            <button
              type="button"
              onClick={props.onDismissPatch}
              className="rounded-md px-2 py-1 text-[9px] text-[#6b7280]"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
