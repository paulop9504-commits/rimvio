"use client";

import { useMemo, useState } from "react";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import { listApprovedCapabilitiesForPlatform } from "@/lib/hub/dev/compatibility-registry";
import {
  buildPlatformCertificationView,
  defaultPublishOptions,
  type HubPublishOptions,
  type HubPublishVisibility,
} from "@/lib/hub/dev/hub-publish-model";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import type { HubPlatformWizard } from "@/hooks/use-hub-platform-wizard";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type HubDevPublishPanelProps = {
  wizard: HubPlatformWizard;
  onPublish: (options: HubPublishOptions) => void;
};

export function HubDevPublishPanel({ wizard, onPublish }: HubDevPublishPanelProps) {
  const { draft, publishStatus, publishReady, testsPassed } = wizard;
  const [options, setOptions] = useState<HubPublishOptions>(() =>
    defaultPublishOptions(draft.actions),
  );

  const ownerId = draft.operator?.name ?? draft.name;
  const manifest = useMemo(() => capabilityDraftToPlatformManifest(draft), [draft]);
  const manifestValid = validateRimvioPlatformManifest(manifest).valid;

  const certification = buildPlatformCertificationView({
    manifest,
    actions: draft.actions,
    selectedCapabilityIds: options.capabilityIds,
    ownerCreatorId: ownerId,
    testsPassed,
    manifestValid,
  });

  const externalCaps = listApprovedCapabilitiesForPlatform(manifest.package.id);

  const toggleCapability = (id: string) => {
    setOptions((prev) => {
      const has = prev.capabilityIds.includes(id);
      return {
        ...prev,
        capabilityIds: has
          ? prev.capabilityIds.filter((c) => c !== id)
          : [...prev.capabilityIds, id],
      };
    });
  };

  if (publishStatus === "submitting") {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 className="size-10 animate-spin text-[#6366F1]" />
        <p className="text-[15px] font-semibold text-[#0F172A]">Publishing…</p>
      </div>
    );
  }

  if (publishStatus === "pending-review" || publishStatus === "published") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Check className="mx-auto size-8 text-emerald-600" />
        <p className="mt-3 text-[16px] font-bold text-emerald-900">Published</p>
        <p className="mt-1 text-[13px] text-emerald-700">
          Platform + {options.capabilityIds.length} capabilities → Hub Registry
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">Publish Platform</p>
        <h2 className="mt-1 text-[20px] font-bold text-[#0f172a]">{draft.name}</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          Platform 개발 단위를 Publish하면 선택한 <strong>Capabilities</strong>가 Registry에
          올라가 Rimvio Agent의 능력이 됩니다. Platform 이름은 Agent discovery 대상이 아닙니다.
          소유권은 각 Creator에게 남습니다.
        </p>
      </div>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <p className="text-[12px] font-semibold text-[#334155]">Platform</p>
        <p className="mt-1 text-[14px] font-medium text-[#0f172a]">✓ {draft.name}</p>
        <p className="mt-0.5 text-[11px] text-[#64748b]">Owner · {ownerId}</p>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <p className="mb-3 text-[12px] font-semibold text-[#334155]">
          Capabilities (owned by {ownerId})
        </p>
        <ul className="space-y-2">
          {draft.actions.map((action) => (
            <li key={action.id}>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={options.capabilityIds.includes(action.id)}
                  onChange={() => toggleCapability(action.id)}
                />
                <span className="font-mono text-[#0f172a]">{action.name}</span>
                {certification.capabilities.find((c) => c.capabilityId === action.name)
                  ?.rimvioCertified ? (
                  <span className="rounded bg-emerald-50 px-1.5 text-[10px] text-emerald-700">
                    Certified
                  </span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>

        {externalCaps.length > 0 ? (
          <div className="mt-4 border-t border-[#F1F5F9] pt-3">
            <p className="text-[11px] font-semibold text-[#64748b]">
              Attached (third-party · approved)
            </p>
            <ul className="mt-2 space-y-1 text-[12px] font-mono text-[#475569]">
              {externalCaps.map((g) => (
                <li key={g.id}>
                  {g.capabilityId} · owner {g.capabilityOwnerId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-4">
        <p className="mb-3 text-[12px] font-semibold text-[#334155]">Visibility</p>
        <div className="space-y-2">
          {(
            [
              ["private", "Private — Platform Host only, not in Agent discovery"],
              ["hub", "Hub — Capability Registry (recommended)"],
              ["public", "Public — Hub + open discovery"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 text-[12px] text-[#334155]">
              <input
                type="radio"
                name="visibility"
                checked={options.visibility === value}
                onChange={() =>
                  setOptions((prev) => ({
                    ...prev,
                    visibility: value as HubPublishVisibility,
                  }))
                }
                className="mt-0.5"
              />
              {label}
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[#334155]">
          <input
            type="checkbox"
            checked={options.allowAgentAccess}
            onChange={(e) =>
              setOptions((prev) => ({ ...prev, allowAgentAccess: e.target.checked }))
            }
          />
          Allow Rimvio Agent discovery
        </label>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[11px]">
        <p className="font-semibold text-[#334155]">Platform certification</p>
        <ul className="mt-2 space-y-1 text-[#64748b]">
          <CertRow ok={certification.compositionCheck} label="Composition check" />
          <CertRow ok={certification.integrationTest} label="Integration test" />
          <CertRow ok={certification.agentSimulation} label="Agent simulation" />
          <CertRow ok={certification.endToEnd} label="End-to-end" />
        </ul>
        <p
          className={cn(
            "mt-3 font-semibold",
            certification.platformCertified ? "text-emerald-700" : "text-amber-700",
          )}
        >
          {certification.platformCertified ? "✓ Platform Certified" : "○ Complete tests first"}
        </p>
        <p className="mt-2 text-[10px] text-[#94a3b8]">
          Certified = Rimvio 계약·실행환경 통과 (ADR-061). Capability Certified와 별도 — 모든 조합의
          무조건 작동 보증은 아닙니다.
        </p>
      </section>

      <button
        type="button"
        disabled={!publishReady || options.capabilityIds.length === 0}
        onClick={() => onPublish(options)}
        className="w-full rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] py-3 text-[14px] font-bold text-white disabled:opacity-40"
      >
        Publish Platform + {options.capabilityIds.length} Capabilities
      </button>
    </div>
  );
}

function CertRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-emerald-700" : "text-[#94A3B8]"}>
      {ok ? "✓" : "○"} {label}
    </li>
  );
}
