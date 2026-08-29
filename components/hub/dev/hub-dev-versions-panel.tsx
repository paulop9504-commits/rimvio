"use client";

import { useMemo } from "react";
import { readCapabilityIndex } from "@/lib/platform-sdk/capability-index";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";

type HubDevVersionsPanelProps = {
  draft: PlatformDraft;
  publishStatus: "idle" | "submitting" | "pending-review" | "published";
};

export function HubDevVersionsPanel({ draft, publishStatus }: HubDevVersionsPanelProps) {
  const manifest = useMemo(() => capabilityDraftToPlatformManifest(draft), [draft]);
  const indexEntries = readCapabilityIndex().filter((e) => e.platformId === manifest.package.id);

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Versions</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">Platform & Capability versions</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Breaking changes affect Agent compatibility — bump before Publish.
      </p>

      <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Current draft</h3>
        <dl className="mt-3 space-y-2 text-[12px]">
          <Row label="Platform" value={`${draft.name} · v${draft.version}`} />
          <Row label="Package ID" value={manifest.package.id} mono />
          <Row label="Publish state" value={publishStatus} />
          <Row label="Capabilities" value={String(draft.actions.length)} />
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
        <h3 className="text-[13px] font-semibold text-[#334155]">Registry (published)</h3>
        {indexEntries.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#94a3b8]">Not in Hub Registry yet</p>
        ) : (
          <ul className="mt-3 space-y-2 text-[12px]">
            {indexEntries.map((e) => (
              <li
                key={e.capabilityId}
                className="flex items-center justify-between rounded-lg border border-[#F1F5F9] px-3 py-2"
              >
                <span className="font-mono text-[#334155]">{e.capabilityId}</span>
                <span className="text-[#64748b]">{e.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-[11px] text-[#94a3b8]">
        Agent availability = Capability version + compatibility grant + runtime ready.
      </p>
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
    <div className="flex justify-between gap-4">
      <dt className="text-[#64748b]">{label}</dt>
      <dd className={mono ? "font-mono text-[#0f172a]" : "text-[#0f172a]"}>{value}</dd>
    </div>
  );
}
