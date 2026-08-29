"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildPlatformCapabilityHref,
  readGlobeCapabilityDiscoveryProjection,
  subscribeGlobeCapabilityDiscovery,
  type GlobeCapabilityDiscoveryProjection,
} from "@/lib/context-run/globe-capability-discovery-turn";
import { cn } from "@/lib/utils";

type AgentCapabilityDiscoveryCardProps = {
  className?: string;
  onDismiss?: () => void;
};

export function AgentCapabilityDiscoveryCard({
  className,
  onDismiss,
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

  const { plan, prepareOk, platformHref, alternateHits } = projection;

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">
        Capability 발견
      </p>
      <p className="mt-1 text-[14px] font-semibold text-[#0f172a]">{plan.capabilityId}</p>
      <p className="mt-0.5 text-[11px] text-[#64748b]">
        {plan.platformName} · Capability Discovery (Platform 직접 실행 아님)
      </p>
      <p className="mt-1 text-[11px] text-[#64748b]">
        {prepareOk ? "Prepare 완료 · Capability 실행 준비됨" : "매칭됨 · Platform 열기"}
      </p>

      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2">
        <p className="font-mono text-[12px] font-medium text-emerald-900">{plan.capabilityId}</p>
        <p className="mt-0.5 text-[11px] text-emerald-700">
          {plan.marketCountry} · composite {(plan.score * 100).toFixed(0)}%
        </p>
        <p className="mt-0.5 text-[10px] text-emerald-600">
          Intent {(plan.scores.intentMatch * 100).toFixed(0)}% · Context{" "}
          {(plan.scores.contextMatch * 100).toFixed(0)}% · Reliability{" "}
          {(plan.scores.reliability * 100).toFixed(0)}%
        </p>
        {projection.compatibility.graphValid ? (
          <p className="mt-1 text-[10px] text-emerald-600">
            Compatibility · {projection.compatibility.summaryKo}
          </p>
        ) : null}
        {projection.execution.runtime ? (
          <p className="mt-1 text-[10px] text-[#475569]">
            Router · {projection.router.runtimeName} · {projection.router.routedVia}
            {projection.router.durationMs != null
              ? ` · ${projection.router.durationMs}ms`
              : ""}
          </p>
        ) : null}
        {projection.rankedRuntimes.length > 1 ? (
          <p className="mt-0.5 text-[9px] text-[#94a3b8]">
            +{projection.rankedRuntimes.length - 1} fallback candidate(s) in registry
          </p>
        ) : null}
        {plan.approvalRequired ? (
          <p className="mt-1 text-[10px] font-medium text-amber-700">
            승인 필요 — Commit 전 사용자 확인
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={platformHref}
          className="inline-flex items-center rounded-xl bg-[#4593fc] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#3a82e0]"
        >
          Platform 열기
        </Link>
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

      {alternateHits.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-[#f1f5f9] pt-3 text-[11px] text-[#64748b]">
          {alternateHits.slice(0, 2).map((hit) => (
            <li key={hit.capabilityId}>
              <Link
                href={buildPlatformCapabilityHref(hit)}
                className="font-mono text-[#6366f1] hover:underline"
              >
                {hit.capabilityId}
              </Link>
              {" · "}
              {hit.platformName}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
