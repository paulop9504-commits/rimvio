"use client";

/**
 * ContextNode — Globe Context projection.
 *
 * Click flow:
 *   Globe → Context Preview → Open Workspace
 *
 * Globe remains Read Only. Open Workspace is handoff only (no edit on Globe).
 */

import { useState } from "react";
import { ChevronRight, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RealityNode } from "@/components/globe/RealityNode";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import type { RealityProjectionNode } from "@/lib/globe/reality-interface";
import { cn } from "@/lib/utils";

export type ContextNodeProps = {
  readonly node: RealityProjectionNode;
  readonly selected?: boolean;
  readonly onSelect?: (node: RealityProjectionNode) => void;
  /** When true, expands inline preview before Open Workspace */
  readonly previewOnSelect?: boolean;
  readonly className?: string;
};

export function ContextNode({
  node,
  selected = false,
  onSelect,
  previewOnSelect = true,
  className,
}: ContextNodeProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const contextId = node.contextId?.trim() ?? "";

  const handleSelect = (n: RealityProjectionNode) => {
    onSelect?.(n);
    if (previewOnSelect) {
      setPreviewOpen(true);
    }
  };

  const openWorkspace = () => {
    if (!contextId) return;
    dispatchContextWorkspaceExpand({
      contextEventId: contextId,
      source: "capsule_resume",
    });
  };

  return (
    <div
      className={cn("w-full", className)}
      data-globe-context-node
      data-read-only="true"
    >
      <RealityNode
        node={{ ...node, kind: "context", level: "context", readOnly: true }}
        selected={selected || previewOpen}
        onSelect={handleSelect}
      />

      <AnimatePresence>
        {previewOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-2 overflow-hidden rounded-[1.15rem] bg-white/96 px-3.5 py-3 shadow-[0_8px_28px_rgba(2,32,71,0.14)] ring-1 ring-black/[0.06] backdrop-blur-xl"
            data-context-preview
          >
            <div className="flex items-start gap-2">
              <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3182f6]" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8b95a1]">
                  Context Preview
                </p>
                <p className="mt-0.5 text-[14px] font-semibold text-[#191f28]">
                  {node.titleKo}
                </p>
                <p className="mt-1 text-[12px] leading-snug text-[#6b7684]">
                  Globe는 Reality View예요 · 수정은 Workspace에서만
                </p>
                {node.pathLabels.length > 0 ? (
                  <p className="mt-1.5 text-[11px] text-[#8b95a1]">
                    {node.pathLabels.join(" → ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={openWorkspace}
                disabled={!contextId}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-[#3182f6] px-3.5 py-2.5 text-[13px] font-semibold text-white active:scale-[0.98] disabled:opacity-40"
                data-open-workspace
              >
                Open Workspace
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="shrink-0 rounded-full px-3 py-2 text-[12px] font-medium text-[#6b7684] active:bg-black/[0.04]"
              >
                닫기
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
