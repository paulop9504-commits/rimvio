"use client";

import { DEPLOY_AGENT_TEMPLATES } from "@/lib/hub/deploy/hub-deploy-agent";

type HubDeployTemplatesProps = {
  onSelect: (utterance: string) => void;
};

export function HubDeployTemplates({ onSelect }: HubDeployTemplatesProps) {
  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-[#0c0e12] px-4 py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
        다른 아이디어
      </p>
      <div className="flex gap-2 overflow-x-auto rimvio-scroll-touch">
        {DEPLOY_AGENT_TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onSelect(t.utterance)}
            className="shrink-0 rounded-xl border border-white/[0.08] bg-[#151820] px-3 py-2 text-left text-[11px] text-[#b0b8c1] hover:border-[#4593fc]/30 hover:text-[#f2f4f6]"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
