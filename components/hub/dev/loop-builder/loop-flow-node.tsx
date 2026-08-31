"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  MessageCircleQuestion,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LoopFlowNodeData } from "@/lib/agent-os/loop-builder/graph-sync";
import type { LoopNodeKind } from "@/lib/agent-os/loop-builder/types";

function kindMeta(kind: LoopNodeKind): { icon: typeof Play; tone: string; sub: string } {
  switch (kind) {
    case "TRIGGER":
      return { icon: Play, tone: "border-sky-200 bg-sky-50 text-sky-800", sub: "Trigger" };
    case "UNDERSTAND":
      return { icon: Sparkles, tone: "border-violet-200 bg-violet-50 text-violet-800", sub: "Understand" };
    case "CONDITION":
    case "DECIDE":
      return { icon: GitBranch, tone: "border-amber-200 bg-amber-50 text-amber-900", sub: "Condition" };
    case "VERIFY":
      return { icon: ShieldCheck, tone: "border-emerald-200 bg-emerald-50 text-emerald-800", sub: "Verify" };
    case "RETRY":
    case "REPLAN":
      return { icon: RefreshCw, tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800", sub: "Loop" };
    case "ASK_USER":
      return { icon: UserRound, tone: "border-pink-200 bg-pink-50 text-pink-800", sub: "Human" };
    case "APPROVAL":
      return { icon: MessageCircleQuestion, tone: "border-indigo-200 bg-indigo-50 text-indigo-800", sub: "Approval" };
    case "COMPLETE":
      return { icon: CheckCircle2, tone: "border-emerald-300 bg-emerald-100 text-emerald-900", sub: "Complete" };
    case "FAIL":
      return { icon: AlertTriangle, tone: "border-red-200 bg-red-50 text-red-800", sub: "Fail" };
    case "CAPABILITY":
    case "ACT":
    case "TOOL":
      return { icon: Zap, tone: "border-violet-200 bg-white text-violet-900", sub: "Capability" };
    default:
      return { icon: Zap, tone: "border-[#e5e7eb] bg-white text-[#374151]", sub: kind };
  }
}

function TestBadge({ status }: { status: LoopFlowNodeData["testStatus"] }) {
  if (!status || status === "pending") {
    return <span className="text-[8px] text-[#9ca3af]">○</span>;
  }
  if (status === "running") {
    return <span className="inline-flex size-2 animate-pulse rounded-full bg-violet-500" />;
  }
  if (status === "pass") return <span className="text-[9px] text-emerald-600">✓</span>;
  if (status === "fail") return <span className="text-[9px] text-red-600">✗</span>;
  return <span className="text-[8px] text-[#9ca3af]">—</span>;
}

function NodeShell({
  data,
  selected,
  children,
  className,
}: {
  data: LoopFlowNodeData;
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { loopNode, testStatus, highlighted, dimmed } = data;
  const meta = kindMeta(loopNode.kind);
  const Icon = meta.icon;
  const subtitle =
    loopNode.config.capabilityId ??
    loopNode.config.toolId ??
    loopNode.config.predicate ??
    loopNode.kind.toLowerCase();

  return (
    <div
      className={cn(
        "min-w-[168px] max-w-[220px] rounded-xl border px-2.5 py-2 shadow-sm transition-all",
        meta.tone,
        selected && "ring-2 ring-violet-400 ring-offset-1",
        highlighted && "ring-2 ring-violet-500 ring-offset-2 shadow-md",
        dimmed && "opacity-35",
        testStatus === "running" && "shadow-[0_0_0_3px_rgba(124,58,237,0.25)]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 size-3.5 shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-[10px] font-semibold leading-tight">{loopNode.label}</p>
            <TestBadge status={testStatus} />
          </div>
          <p className="text-[8px] font-medium uppercase tracking-wide opacity-70">{meta.sub}</p>
          <p className="mt-0.5 truncate font-mono text-[8px] opacity-60">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export const LoopTriggerNode = memo(function LoopTriggerNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected} className="rounded-full px-4 py-2">
      <Handle type="source" position={Position.Bottom} id="next" className="!h-2 !w-2 !border-violet-400 !bg-white" />
    </NodeShell>
  );
});

export const LoopActionNode = memo(function LoopActionNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected}>
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-violet-400 !bg-white" />
      <Handle type="source" position={Position.Bottom} id="next" className="!h-2 !w-2 !border-violet-400 !bg-white" />
    </NodeShell>
  );
});

export const LoopVerifyNode = memo(function LoopVerifyNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected}>
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-emerald-500 !bg-white" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "35%" }}
        className="!h-2 !w-2 !border-emerald-500 !bg-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "65%" }}
        className="!h-2 !w-2 !border-amber-500 !bg-white"
      />
    </NodeShell>
  );
});

export const LoopConditionNode = memo(function LoopConditionNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  const { loopNode } = props.data;
  const predicate = loopNode.config.predicate ?? "condition";

  return (
    <div className={cn("relative", props.selected && "ring-2 ring-amber-400 ring-offset-2")}>
      <div
        className={cn(
          "relative flex h-[88px] w-[148px] items-center justify-center",
          props.data.dimmed && "opacity-35",
          props.data.highlighted && "drop-shadow-md",
        )}
      >
        <div className="absolute inset-2 rotate-45 rounded-lg border-2 border-amber-300 bg-amber-50 shadow-sm" />
        <div className="relative z-10 px-2 text-center">
          <p className="text-[9px] font-semibold text-amber-900">{loopNode.label}</p>
          <p className="mt-0.5 font-mono text-[7px] text-amber-700">{predicate}</p>
          <div className="mt-1 flex justify-center">
            <TestBadge status={props.data.testStatus} />
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} id="in" className="!top-0 !h-2 !w-2 !border-amber-500 !bg-white" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "28%" }}
        className="!h-2 !w-2 !border-emerald-500 !bg-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "72%" }}
        className="!h-2 !w-2 !border-red-400 !bg-white"
      />
    </div>
  );
});

export const LoopHumanNode = memo(function LoopHumanNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected} className="border-pink-200 bg-pink-50">
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-pink-400 !bg-white" />
      <Handle type="source" position={Position.Bottom} id="next" className="!h-2 !w-2 !border-pink-400 !bg-white" />
    </NodeShell>
  );
});

export const LoopTerminalNode = memo(function LoopTerminalNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected} className="rounded-full px-4 py-2">
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-[#94a3b8] !bg-white" />
    </NodeShell>
  );
});

export const LoopLoopNode = memo(function LoopLoopNode(props: NodeProps<Node<LoopFlowNodeData>>) {
  return (
    <NodeShell data={props.data} selected={props.selected} className="border-fuchsia-300 bg-fuchsia-50">
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-fuchsia-400 !bg-white" />
      <Handle type="source" position={Position.Bottom} id="next" className="!h-2 !w-2 !border-fuchsia-400 !bg-white" />
      <Handle
        type="source"
        position={Position.Left}
        id="loop"
        className="!h-2 !w-2 !border-violet-500 !bg-white"
      />
    </NodeShell>
  );
});

export const LOOP_FLOW_NODE_TYPES = {
  loopTrigger: LoopTriggerNode,
  loopAction: LoopActionNode,
  loopCondition: LoopConditionNode,
  loopHuman: LoopHumanNode,
  loopTerminal: LoopTerminalNode,
  loopLoop: LoopLoopNode,
  loopVerify: LoopVerifyNode,
};
