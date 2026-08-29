"use client";

import { useEffect, useState } from "react";
import {
  readGlobeCapabilityDiscoveryProjection,
  subscribeGlobeCapabilityDiscovery,
  type GlobeCapabilityDiscoveryProjection,
} from "@/lib/context-run/globe-capability-discovery-turn";
import { cn } from "@/lib/utils";

type AgentCapabilityDiscoveryCardProps = {
  className?: string;
  onDismiss?: () => void;
  onApprove?: () => void;
};

export function AgentCapabilityDiscoveryCard({
  className,
  onDismiss,
  onApprove,
}: AgentCapabilityDiscoveryCardProps) {
  const [projection, setProjection] = useState<GlobeCapabilityDiscoveryProjection | null>(
    () => readGlobeCapabilityDiscoveryProjection(),
  );

  useEffect(() => {
    setProjection(readGlobeCapabilityDiscoveryProjection());
    return subscribeGlobeCapabilityDiscovery(() => {
      setProjection(readGlobeCapabilityDiscoveryProjection());
    });
  }, []);

  if (!projection) return null;

  const { awaitingApproval, experience, exposure } = projection;
  const exp = experience;

  if (!exp) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
        {exp.title}
      </p>
      {exp.artifactLabel ? (
        <p className="mt-1 font-mono text-[13px] font-medium text-[#0f172a]">{exp.artifactLabel}</p>
      ) : null}

      {exp.domain === "design" ? (
        <div className="mt-4 flex justify-center py-6">
          <div className="flex size-24 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]">
            <span className="size-8 rounded-full border-2 border-dashed border-[#64748b]" />
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[13px] leading-relaxed text-[#334155]">{exp.workLogKo}</p>

      {exp.fields.length > 0 ? (
        <ul className="mt-3 space-y-1.5 rounded-xl bg-[#f8fafc] px-3 py-2">
          {exp.fields.map((field) => (
            <li
              key={field.label}
              className={cn(
                "flex justify-between text-[12px]",
                field.highlight ? "font-semibold text-[#0f172a]" : "text-[#64748b]",
              )}
            >
              <span>{field.label}</span>
              <span>
                {field.value}
                {field.unit ? ` ${field.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {exposure && exposure.pipeline.length > 1 ? (
        <p className="mt-2 text-[10px] text-[#94a3b8]">
          {exposure.pipeline.map((s) => s.capabilityId.split(".").pop()).join(" → ")}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {exp.actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.kind === "primary" && awaitingApproval ? onApprove : undefined}
            className={cn(
              "rounded-xl px-4 py-2 text-[12px] font-semibold",
              action.kind === "primary"
                ? "bg-[#4593fc] text-white hover:bg-[#3a82e0]"
                : "border border-[#e2e8f0] text-[#64748b]",
            )}
          >
            {action.label}
          </button>
        ))}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-[#e2e8f0] px-4 py-2 text-[12px] font-medium text-[#64748b]"
          >
            닫기
          </button>
        ) : null}
      </div>
    </div>
  );
}
