"use client";

import { useCallback, useMemo, useState } from "react";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";
import {
  planCapabilityDiscovery,
  planCapabilityDiscoveryFromHits,
} from "@/lib/platform-sdk/discover-capabilities";
import { readCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import { isAgentDiscoverableCapability } from "@/lib/platform-sdk/capability-lifecycle";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { cn } from "@/lib/utils";

type HubDevRegistryE2eProps = {
  draft: PlatformDraft;
  publishStatus: "idle" | "submitting" | "pending-review" | "published";
};

export function HubDevRegistryE2e({ draft, publishStatus }: HubDevRegistryE2eProps) {
  const [utterance, setUtterance] = useState(
    "오사카 난바역 근처 호텔을 찾아서 예약해줘",
  );
  const [ran, setRan] = useState(false);

  const platformId = useMemo(
    () => capabilityDraftToPlatformManifest(draft).package.id,
    [draft],
  );

  const registryEntries = readCapabilityIndex().filter((e) => e.platformId === platformId);
  const topPlan = ran ? planCapabilityDiscovery({ utterance }) : null;
  const allHits = ran
    ? planCapabilityDiscoveryFromHits(utterance).filter((h) => h.platformId === platformId)
    : [];

  const handleRun = useCallback(() => {
    setRan(true);
    const plan = planCapabilityDiscovery({ utterance });
    appendDevExecutionLog({
      platformId,
      platformName: draft.name,
      source: "registry-discovery",
      ok: Boolean(plan),
      detail: plan
        ? `Discovered ${plan.capabilityId} (score via index)`
        : "No matching published capability",
    });
  }, [draft.name, platformId, utterance]);

  const published = registryEntries.some((e) => isAgentDiscoverableCapability(e.status));

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">
        Globe Agent ↔ Registry E2E
      </p>
      <h3 className="mt-1 text-[15px] font-bold text-[#0f172a]">Capability Discovery Test</h3>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Uses real <code className="font-mono text-[11px]">planCapabilityDiscovery</code> against
        Hub Capability Index (localStorage).
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        <Badge ok={published} label={published ? "Registry: published" : "Registry: not published"} />
        <Badge
          ok={publishStatus === "pending-review" || publishStatus === "published"}
          label={`Publish: ${publishStatus}`}
        />
        <Badge ok={registryEntries.length > 0} label={`Entries: ${registryEntries.length}`} />
      </div>

      <textarea
        value={utterance}
        onChange={(e) => setUtterance(e.target.value)}
        rows={2}
        className="mt-4 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[12px]"
      />

      <button
        type="button"
        onClick={handleRun}
        disabled={!published}
        className="mt-3 rounded-lg bg-[#6366F1] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-40"
      >
        Run Agent Discovery
      </button>

      {!published ? (
        <p className="mt-2 text-[11px] text-amber-700">
          Publish to Hub first — then Agent can discover this platform&apos;s capabilities.
        </p>
      ) : null}

      {ran ? (
        <div className="mt-4 space-y-3 text-[12px]">
          {topPlan && topPlan.platformId === platformId ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-900">✓ Agent would route here</p>
              <p className="mt-1 font-mono text-emerald-800">{topPlan.capabilityId}</p>
              <p className="mt-1 text-emerald-700">
                {topPlan.platformName} · {topPlan.marketCountry} · score {topPlan.score.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-600">{topPlan.matchReason}</p>
            </div>
          ) : (
            <p className="text-red-700">
              No discovery match for this platform — check capability keywords in registry.
            </p>
          )}

          {allHits.length > 0 ? (
            <ul className="space-y-1 font-mono text-[11px] text-[#475569]">
              {allHits.map((h) => (
                <li key={h.capabilityId}>
                  {h.capabilityId} · {h.score.toFixed(2)} · {h.matchReason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 font-medium",
        ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
      )}
    >
      {label}
    </span>
  );
}
