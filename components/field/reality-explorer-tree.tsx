"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ProjectTreeNode,
  RealityExplorerSnapshot,
  RealityPreparePlan,
} from "@/lib/reality-explorer";
import { cn } from "@/lib/utils";

function TreeRow({
  node,
  depth,
}: {
  node: ProjectTreeNode;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) {
            setOpen((v) => !v);
          }
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg py-1 pr-2 text-left text-[13px] tracking-tight text-[#191f28]",
          "hover:bg-black/[0.03]",
          hasChildren ? "cursor-pointer" : "cursor-default",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        data-reality-explorer-node={node.id}
        data-kind={node.kind}
      >
        <span className="w-3 shrink-0 text-[10px] text-[#8b95a1]" aria-hidden>
          {hasChildren ? (open ? "▾" : "▸") : "·"}
        </span>
        <span aria-hidden>{node.emoji}</span>
        <span className="truncate font-medium">{node.labelKo}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && hasChildren ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <TreeRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PreparePlanCard({ plan }: { plan: RealityPreparePlan }) {
  return (
    <div
      className="rounded-2xl bg-[#0b0d10] px-3.5 py-3 text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      data-reality-prepare-plan
    >
      <p className="text-[12px] font-semibold text-white/70">{plan.introKo}</p>
      <ul className="mt-2 space-y-1">
        {plan.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center gap-2 text-[13px] tracking-tight"
            data-prepare-step={step.id}
          >
            <span className="text-emerald-400" aria-hidden>
              {step.done ? "✓" : "·"}
            </span>
            <span>{step.labelKo}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[12px] font-medium text-sky-300">
        ↓ {plan.projectingKo}
      </p>
    </div>
  );
}

/** User-facing Info branch — never Ontology / Entity / Relation labels. */
function buildInfoRoot(snapshot: RealityExplorerSnapshot): ProjectTreeNode {
  const entities =
    snapshot.dual.ontologyRoot.children.find((c) => c.labelKo === "Entities")
      ?.children ?? [];
  return {
    id: `${snapshot.projectId}:info`,
    kind: "project",
    sector: null,
    labelKo: "정보",
    emoji: "📋",
    globeProjectable: false,
    lat: null,
    lng: null,
    relationKind: null,
    relatedNodeId: null,
    children: [
      {
        id: `${snapshot.projectId}:info:places`,
        kind: "sector",
        sector: null,
        labelKo: "장소",
        emoji: "📍",
        children: entities.map((n) => ({ ...n, children: [] })),
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
      {
        id: `${snapshot.projectId}:info:plan`,
        kind: "sector",
        sector: null,
        labelKo: "준비 항목",
        emoji: "✓",
        children: snapshot.tree.children
          .filter((c) => c.kind === "sector")
          .map((c) => ({
            ...c,
            children: c.children.map((child) => ({ ...child, children: [] })),
          })),
        globeProjectable: false,
        lat: null,
        lng: null,
        relationKind: null,
        relatedNodeId: null,
      },
    ],
  };
}

export type RealityExplorerTreeProps = {
  snapshot: RealityExplorerSnapshot;
  className?: string;
  showPreparePlan?: boolean;
};

/**
 * Three surfaces only (L1): Globe · Info · Execution Inbox.
 * Ontology jargon stays internal — never shown.
 */
export function RealityExplorerTree({
  snapshot,
  className,
  showPreparePlan = true,
}: RealityExplorerTreeProps) {
  const [branch, setBranch] = useState<"globe" | "info" | "execution">("globe");

  const activeRoot =
    branch === "globe"
      ? snapshot.dual.globeRoot
      : branch === "info"
        ? buildInfoRoot(snapshot)
        : {
            id: `${snapshot.projectId}:execution-view`,
            kind: "project" as const,
            sector: null,
            labelKo: "결재함",
            emoji: "⚡",
            children:
              snapshot.branches.find((b) => b.root === "execution")?.children ??
              [],
            globeProjectable: false,
            lat: null,
            lng: null,
            relationKind: null,
            relatedNodeId: null,
          };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]",
        className,
      )}
      data-reality-explorer
    >
      <div className="border-b border-black/[0.04] px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b95a1]">
          {snapshot.projectTitleKo}
        </p>
        <p className="mt-0.5 text-[15px] font-bold tracking-tight text-[#191f28]">
          {snapshot.tree.emoji} 탐색 · 정보 · 실행
        </p>
      </div>

      <div className="flex gap-1 border-b border-black/[0.04] px-2 py-1.5">
        {(
          [
            ["globe", "🌍 Globe"],
            ["info", "📋 Info"],
            ["execution", "⚡ 결재함"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBranch(id)}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-semibold tracking-tight",
              branch === id
                ? "bg-[#191f28] text-white"
                : "text-[#8b95a1] hover:bg-black/[0.03]",
            )}
            data-explorer-tab={id}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-[280px] overflow-y-auto py-1.5">
        <TreeRow node={activeRoot} depth={0} />
      </div>

      {showPreparePlan ? (
        <div className="border-t border-black/[0.04] p-2.5">
          <PreparePlanCard plan={snapshot.preparePlan} />
        </div>
      ) : null}
    </div>
  );
}
