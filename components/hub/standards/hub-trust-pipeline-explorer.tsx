"use client";

import {
  CAPABILITY_PERMISSION_SPECS,
  TRUST_LANE_STAGES,
} from "@/lib/trust-pipeline";
import { CAPABILITY_DEPLOY_MODELS } from "@/lib/capability-runtime";

const DEPLOY_MODEL_COPY: Record<(typeof CAPABILITY_DEPLOY_MODELS)[number], { title: string; body: string }> = {
  rimvio_hosted: {
    title: "A. Rimvio-hosted",
    body: "소스를 Rimvio가 받아 빌드·샌드박스. 운영은 쉽고 IP는 Rimvio 쪽에 가깝습니다.",
  },
  private_artifact: {
    title: "B. Private Source + Rimvio Runtime (기본)",
    body: "GitHub은 repo 단위 읽기만. CI가 서명한 Artifact만 Runtime에 올라갑니다.",
  },
  dev_hosted: {
    title: "C. Dev-hosted Runtime",
    body: "Gateway가 계약만 보고 Dev 엔드포인트를 호출합니다. 지연·악성 응답을 감시합니다.",
  },
};

const LANE_LABEL: Record<(typeof TRUST_LANE_STAGES)[number], string> = {
  submission: "0 Submission",
  quarantine: "격리",
  automated_guard: "1차 자동 검사",
  sandbox: "2차 Sandbox",
  human_review: "3차 Human Review",
  tested: "TESTED",
  verified: "VERIFIED",
  staging: "4차 Staging",
  canary: "Canary",
  production: "Production",
};

export function HubTrustPipelineExplorer() {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
          Trust Pipeline
        </p>
        <h2 className="mt-1 text-[16px] font-semibold text-[#0f172a]">
          누구나 제출할 수 있지만, 아무것도 바로 실행할 수 없어요
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[#64748b]">
          검수 PASS는 배포 권한이 아니라 다음 단계로 갈 자격입니다. VERIFIED 다음엔 Staging →
          Canary를 거친 뒤에만 Production입니다.
        </p>

        <ol className="mt-4 space-y-1.5">
          {TRUST_LANE_STAGES.map((stage, i) => (
            <li
              key={stage}
              className="flex items-center gap-2 rounded-lg bg-[#f8fafc] px-3 py-1.5 text-[11px] text-[#374151]"
            >
              <span className="w-5 font-mono text-[10px] text-[#94a3b8]">{i}</span>
              {LANE_LABEL[stage]}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-[13px] font-semibold text-[#0f172a]">권한 등급</h3>
        <p className="mt-1 text-[11px] text-[#64748b]">
          외부 Producer는 L0–L1에서 시작합니다. L5는 사람 Commit 없이 실행되지 않습니다.
        </p>
        <ul className="mt-3 space-y-2">
          {CAPABILITY_PERMISSION_SPECS.map((spec) => (
            <li key={spec.id} className="flex gap-2 text-[11px]">
              <span className="w-8 shrink-0 font-mono font-semibold text-violet-700">L{spec.level}</span>
              <span>
                <span className="font-medium text-[#111827]">{spec.titleKo}</span>
                <span className="ml-1 text-[#64748b]">{spec.descriptionKo}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-[13px] font-semibold text-[#0f172a]">실행 모델</h3>
        <p className="mt-1 text-[11px] text-[#64748b]">
          Main Agent → Capability ID → Policy Gateway → Isolated Runtime. 토큰과 소스는 Agent에게 가지
          않습니다.
        </p>
        <ul className="mt-3 space-y-3">
          {CAPABILITY_DEPLOY_MODELS.map((id) => (
            <li key={id} className="rounded-lg bg-[#f8fafc] px-3 py-2">
              <p className="text-[11px] font-semibold text-[#111827]">{DEPLOY_MODEL_COPY[id].title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[#64748b]">{DEPLOY_MODEL_COPY[id].body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
