"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ExperienceBlueprint, ExperienceBlueprintNode } from "@/lib/hub/dev/experience-os/experience-blueprint";

type HubExperienceGraphProps = {
  readonly blueprint: ExperienceBlueprint;
  readonly onSelectNode?: (node: ExperienceBlueprintNode) => void;
  readonly onAsk?: (text: string) => void;
};

export function HubExperienceGraph(props: HubExperienceGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = props.blueprint.nodes.find((n) => n.id === selectedId) ?? null;
  const columns = [
    { title: "Experience", nodes: props.blueprint.nodes.filter((n) => n.kind === "experience") },
    { title: "Pages", nodes: props.blueprint.nodes.filter((n) => n.kind === "page") },
    { title: "Data", nodes: props.blueprint.nodes.filter((n) => n.kind === "data") },
    { title: "Capabilities", nodes: props.blueprint.nodes.filter((n) => n.kind === "capability") },
    { title: "Infra", nodes: props.blueprint.nodes.filter((n) => n.kind === "infra") },
  ];

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-wide text-[#9ca3af]">Visual Blueprint</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#111827]">{props.blueprint.titleKo}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-1 text-[8px] font-bold uppercase tracking-wide text-[#9ca3af]">{col.title}</p>
            <div className="space-y-1">
              {col.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(node.id);
                    props.onSelectNode?.(node);
                  }}
                  className={cn(
                    "w-full truncate rounded-lg border px-2 py-1 text-left text-[10px]",
                    selectedId === node.id
                      ? "border-violet-300 bg-violet-50 text-violet-800"
                      : "border-[#f3f4f6] bg-[#fafafa] text-[#374151] hover:border-violet-200",
                  )}
                >
                  {node.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selected ? (
        <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50/60 p-2.5">
          <p className="font-mono text-[11px] font-semibold text-violet-800">{selected.label}</p>
          <p className="mt-1 text-[10px] text-[#6b7280]">
            kind {selected.kind} · depends {selected.dependsOn.join(", ") || "—"} · {selected.status}
          </p>
          {props.onAsk ? (
            <button
              type="button"
              onClick={() => props.onAsk?.(`${selected.label} 리소스를 구성해줘`)}
              className="mt-2 text-[10px] font-semibold text-violet-700 hover:underline"
            >
              Ask Rimvio about this node
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
