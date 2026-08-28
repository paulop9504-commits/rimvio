"use client";

import { useMemo } from "react";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevWorkflowEditorProps = {
  draft: PlatformDraft;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
};

export function HubDevWorkflowEditor({
  draft,
  selectedNodeId,
  onSelectNode,
}: HubDevWorkflowEditorProps) {
  const graph = useMemo(() => parseWorkflowGraph(draft), [draft]);
  const selected = graph.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#0c0e12] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#6b7684]">Workflow</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#f2f4f6]">{graph.name}</h2>
        <p className="mt-1 text-[12px] text-[#6b7684]">
          {draft.workflowDescription || "No workflow description — derived from capabilities."}
        </p>

        <div className="mt-8 flex flex-col items-center gap-0">
          {graph.nodes.map((node, i) => (
            <div key={node.id} className="flex w-full max-w-md flex-col items-center">
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                  node.kind === "approval"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-white/[0.08] bg-[#151820]",
                  selectedNodeId === node.id && "ring-2 ring-[#4593fc]/50",
                )}
              >
                <p
                  className={cn(
                    "font-mono text-[12px] font-semibold",
                    node.kind === "approval" ? "text-amber-400" : "text-[#8ec0ff]",
                  )}
                >
                  {node.label}
                </p>
                {node.financial ? (
                  <p className="mt-1 text-[10px] text-amber-500">⚠ FINANCIAL SIDE EFFECT</p>
                ) : node.approvalRequired ? (
                  <p className="mt-1 text-[10px] text-[#6b7684]">Requires approval</p>
                ) : null}
              </button>
              {i < graph.nodes.length - 1 ? (
                <div className="flex h-8 flex-col items-center justify-center text-[#4b5563]">
                  <span className="h-4 w-px bg-white/10" />
                  <span>↓</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <aside className="w-[280px] shrink-0 border-l border-white/[0.06] bg-[#0e1014] p-4">
        <p className="text-[11px] font-semibold text-[#b0b8c1]">Workflow Inspector</p>
        {selected ? (
          <dl className="mt-3 space-y-3 text-[11px]">
            <Row label="Node" value={selected.label} mono />
            <Row label="Kind" value={selected.kind} />
            {selected.capabilityId ? <Row label="Capability" value={selected.capabilityId} mono /> : null}
            <Row
              label="Approval"
              value={selected.approvalRequired || selected.kind === "approval" ? "Required" : "None"}
            />
            <Row label="Error handling" value="Retry × 2 (planned)" />
          </dl>
        ) : (
          <p className="mt-3 text-[11px] text-[#6b7684]">노드를 선택하면 Inspector가 열립니다.</p>
        )}
        <p className="mt-6 text-[10px] text-amber-500/80">
          AI workflow edit (Diff → Apply) — Phase 7+
        </p>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[#6b7684]">{label}</dt>
      <dd className={cn("text-[#b0b8c1]", mono && "font-mono")}>{value}</dd>
    </div>
  );
}
