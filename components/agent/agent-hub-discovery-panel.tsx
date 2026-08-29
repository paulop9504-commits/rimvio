"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  readCapabilityIndex,
  subscribeCapabilityIndex,
  type CapabilityIndexEntry,
} from "@/lib/platform-sdk/capability-index";
import { isAgentDiscoverableCapability } from "@/lib/platform-sdk/capability-lifecycle";
import { buildPlatformCapabilityHref } from "@/lib/context-run/globe-capability-discovery-turn";
import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import {
  planCapabilityDiscovery,
  planCapabilityDiscoveryFromHits,
} from "@/lib/platform-sdk/discover-capabilities";
import { cn } from "@/lib/utils";

type AgentHubDiscoveryPanelProps = {
  onTryUtterance?: (utterance: string) => void;
  className?: string;
};

type PlatformGroup = {
  platformId: string;
  platformName: string;
  capabilities: CapabilityIndexEntry[];
};

function groupPublished(entries: readonly CapabilityIndexEntry[]): PlatformGroup[] {
  const published = entries.filter((e) => isAgentDiscoverableCapability(e.status));
  const map = new Map<string, PlatformGroup>();
  for (const e of published) {
    const existing = map.get(e.platformId);
    if (existing) {
      existing.capabilities.push(e);
    } else {
      map.set(e.platformId, {
        platformId: e.platformId,
        platformName: e.platformName,
        capabilities: [e],
      });
    }
  }
  return [...map.values()];
}

const DEMO_SEEDS = [
  "중고 자전거 팔고 싶어",
  "도쿄에서 호텔 찾아줘",
  "오사카 난바역 근처 호텔을 찾아서 예약해줘",
] as const;

export function AgentHubDiscoveryPanel({
  onTryUtterance,
  className,
}: AgentHubDiscoveryPanelProps) {
  const [index, setIndex] = useState<readonly CapabilityIndexEntry[]>(() =>
    readCapabilityIndex(),
  );
  const [previewUtterance, setPreviewUtterance] = useState<string>(DEMO_SEEDS[0]!);
  const [previewPlan, setPreviewPlan] = useState<CapabilityDiscoveryPlan | null>(null);

  useEffect(() => {
    setIndex(readCapabilityIndex());
    return subscribeCapabilityIndex(() => setIndex(readCapabilityIndex()));
  }, []);

  const groups = useMemo(() => groupPublished(index), [index]);
  const publishedCount = index.filter((e) => isAgentDiscoverableCapability(e.status)).length;
  const [previewAlternates, setPreviewAlternates] = useState<readonly CapabilityDiscoveryPlan[]>([]);

  const runPreview = () => {
    const plan = planCapabilityDiscovery({ utterance: previewUtterance });
    setPreviewPlan(plan);
    setPreviewAlternates(
      plan
        ? planCapabilityDiscoveryFromHits(previewUtterance).filter(
            (h) => h.capabilityId !== plan.capabilityId,
          )
        : [],
    );
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-[#e8ecf1] bg-white/90 p-4 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Hub Registry
          </p>
          <h3 className="mt-0.5 text-[15px] font-bold text-[#0f172a]">Published Capability Discovery</h3>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Agent는 Platform이 아니라 <strong>capabilityId</strong>만 발견 · {publishedCount}개 PUBLISHED
          </p>
        </div>
        <Link
          href="/hub/workspace?nav=deployments"
          className="shrink-0 text-[11px] font-medium text-[#6366f1] hover:underline"
        >
          Hub에서 Publish
        </Link>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-3 py-4 text-center text-[12px] text-[#64748b]">
          아직 Publish된 Platform이 없습니다. Dev Workspace에서 Publish하면 여기에 표시됩니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {groups.map((g) => (
            <li
              key={g.platformId}
              className="rounded-xl border border-[#f1f5f9] bg-[#fafbfc] px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-[#0f172a]">{g.platformName}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {g.capabilities.slice(0, 6).map((cap) => (
                  <li key={cap.capabilityId}>
                    <Link
                      href={buildPlatformCapabilityHref({
                        capabilityId: cap.capabilityId,
                        platformId: cap.platformId,
                        platformName: cap.platformName,
                        marketCountry: cap.marketCountry,
                        routePath: cap.routePath,
                        approvalRequired: cap.approvalRequired,
                        planLabelKo: cap.capabilityId,
                        score: 1,
                        matchReason: "registry",
                        scores: {
                          intentMatch: 1,
                          contextMatch: 1,
                          reliability: 1,
                          composite: 1,
                        },
                        intentDomain: "general",
                      })}
                      className="inline-block rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-[#475569] ring-1 ring-[#e2e8f0] hover:text-[#6366f1]"
                    >
                      {cap.capabilityId}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-[#f1f5f9] pt-4">
        <p className="text-[11px] font-semibold text-[#334155]">Discovery 미리보기</p>
        <div className="mt-2 flex gap-2">
          <input
            value={previewUtterance}
            onChange={(e) => setPreviewUtterance(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-[12px]"
            placeholder="무엇을 하고 싶은지 입력"
          />
          <button
            type="button"
            onClick={runPreview}
            className="shrink-0 rounded-lg bg-[#6366f1] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Match
          </button>
        </div>
        {previewPlan ? (
          <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            <p>
              ✓ <span className="font-mono font-semibold">{previewPlan.capabilityId}</span>
              <span className="text-emerald-700"> · via {previewPlan.platformName}</span>
            </p>
            <p className="mt-1 text-[10px] text-emerald-700">
              Intent {(previewPlan.scores.intentMatch * 100).toFixed(0)}% · Context{" "}
              {(previewPlan.scores.contextMatch * 100).toFixed(0)}% · Reliability{" "}
              {(previewPlan.scores.reliability * 100).toFixed(0)}%
            </p>
            {onTryUtterance ? (
              <button
                type="button"
                onClick={() => onTryUtterance(previewUtterance)}
                className="mt-1 font-semibold text-emerald-900 underline"
              >
                Agent에게 보내기
              </button>
            ) : null}
            {previewAlternates.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-[10px] text-emerald-700">
                {previewAlternates.map((alt) => (
                  <li key={alt.capabilityId}>
                    alt · {alt.capabilityId} ({(alt.score * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-[#94a3b8]">
            Match를 눌러 Registry 검색을 확인하세요 · 미매칭 시 Native Agent fallback
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_SEEDS.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => setPreviewUtterance(seed)}
              className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] text-[#64748b] hover:bg-[#e2e8f0]"
            >
              {seed.slice(0, 18)}…
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
