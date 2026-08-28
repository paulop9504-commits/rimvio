"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import type { CapabilityDraft, PublishStatus } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { MarketDeploymentPanel } from "@/components/hub/wizard/market-deployment-panel";
import { isMarketPublishReady } from "@/lib/platform-sdk/markets";
import { DEPLOY_UI_STEPS, type DeployUiStepId } from "@/lib/hub/deploy/deploy-steps";
import { cn } from "@/lib/utils";

type HubDeployInspectorProps = {
  mode: "capability" | "platform";
  draft: CapabilityDraft | PlatformDraft;
  activeUiStep: DeployUiStepId;
  stepChecks: Record<DeployUiStepId, boolean>;
  publishReady: boolean;
  publishStatus: PublishStatus;
  lastPublishedPlatformId: string | null;
  onChange: (patch: Partial<CapabilityDraft>) => void;
  onPublish: () => void;
};

function DeployPreviewCard({ draft }: { draft: CapabilityDraft }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#151820]">
      <div className="h-24 bg-gradient-to-br from-[#4593fc]/30 via-[#6366f1]/20 to-[#0c0e12]" />
      <div className="p-3">
        <div className="mb-2 flex items-start gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#4593fc]/20 text-sm font-bold text-[#8ec0ff]">
            {draft.name.slice(0, 1).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-[#f2f4f6]">
              {draft.name || "Untitled"}
            </p>
            <p className="text-[10px] text-[#6b7684]">v{draft.version}</p>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {draft.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[#4593fc]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#8ec0ff]"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="line-clamp-2 text-[11px] text-[#b0b8c1]">
          {draft.description || "설명을 추가하세요"}
        </p>
      </div>
    </div>
  );
}

export function HubDeployInspector({
  mode,
  draft,
  activeUiStep,
  stepChecks,
  publishReady,
  publishStatus,
  lastPublishedPlatformId,
  onChange,
  onPublish,
}: HubDeployInspectorProps) {
  const marketReady = draft.markets.deployments.every((d) =>
    isMarketPublishReady(d),
  );
  const consentsOk =
    draft.publishConsents.rights &&
    draft.publishConsents.permissions &&
    draft.publishConsents.policy &&
    draft.publishConsents.tested;

  return (
    <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col border-l border-white/[0.06] bg-[#111318] xl:w-[300px]">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 rimvio-scroll-touch">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
          Capability Preview
        </p>
        <DeployPreviewCard draft={draft} />

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
            진행 단계
          </p>
          <ul className="space-y-1">
            {DEPLOY_UI_STEPS.map((step) => {
              const done = stepChecks[step.id];
              const active = step.id === activeUiStep;
              return (
                <li
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                    active ? "bg-[#4593fc]/10 text-[#8ec0ff]" : "text-[#b0b8c1]",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle className="size-3.5 shrink-0 text-[#6b7684]" />
                  )}
                  {step.labelKo}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
            Market 지원
          </p>
          <MarketDeploymentPanel draft={draft} onChange={onChange} compact />
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#151820] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6b7684]">
            <ShieldCheck className="size-3.5" />
            보안 · 컴플라이언스
          </p>
          <ul className="space-y-1.5 text-[11px]">
            <li className="flex justify-between text-[#b0b8c1]">
              <span>개인정보 처리방침</span>
              <span className={draft.publishConsents.policy ? "text-emerald-400" : "text-[#6b7684]"}>
                {draft.publishConsents.policy ? "완료" : "대기"}
              </span>
            </li>
            <li className="flex justify-between text-[#b0b8c1]">
              <span>데이터 보안</span>
              <span className="text-emerald-400">Sandbox</span>
            </li>
            <li className="flex justify-between text-[#b0b8c1]">
              <span>사용자 권한</span>
              <span className="text-[#8ec0ff]">
                {draft.permissions.filter((p) => p.enabled).length}개
              </span>
            </li>
          </ul>
        </div>

        {publishStatus === "pending-review" && lastPublishedPlatformId ? (
          <Link
            href={`/platform/${lastPublishedPlatformId}`}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[#4593fc]/30 bg-[#4593fc]/10 py-2.5 text-[12px] font-semibold text-[#8ec0ff] hover:bg-[#4593fc]/20"
          >
            Platform Runtime 열기
            <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        {publishStatus === "pending-review" ? (
          <p className="text-center text-[12px] font-medium text-emerald-400">
            제출 완료 · 검토 대기 중
          </p>
        ) : (
          <button
            type="button"
            onClick={onPublish}
            disabled={!publishReady || publishStatus === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4593fc] to-[#6366f1] py-3 text-[13px] font-bold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishStatus === "submitting" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                제출 중…
              </>
            ) : (
              mode === "platform" ? "Platform 제출하기" : "제출하기"
            )}
          </button>
        )}
        {!publishReady && publishStatus !== "pending-review" ? (
          <p className="mt-2 text-center text-[10px] text-[#6b7684]">
            {!marketReady
              ? "Market readiness 100% 필요"
              : !consentsOk
                ? "제출 동의 항목을 확인하세요"
                : "모든 단계를 완료하세요"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
