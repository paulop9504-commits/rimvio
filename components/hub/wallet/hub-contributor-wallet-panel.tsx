"use client";

import type { ContributorWalletSnapshot } from "@/lib/hub/wallet/fetch-contributor-wallet";
import type { ContributorLedgerEntryKind } from "@/lib/contributor-ledger";

type HubContributorWalletPanelProps = {
  readonly roleLabel: string;
  readonly wallet: ContributorWalletSnapshot | null;
  readonly loading?: boolean;
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-[#0f172a]">{value}</p>
      {sub ? <p className="mt-1 text-[11px] text-[#94a3b8]">{sub}</p> : null}
    </div>
  );
}

const KIND_LABEL: Record<ContributorLedgerEntryKind, string> = {
  capability_execution: "Capability",
  capability_improvement: "Capability 개선",
  data_submission: "데이터 제출",
  human_verification: "검수",
  expert_review: "전문 검수",
  composite_split: "Composite",
  business_supply: "사업자 공급",
};

export function HubContributorWalletPanel({
  roleLabel,
  wallet,
  loading,
}: HubContributorWalletPanelProps) {
  const fmt = (n: number) => `₩${n.toLocaleString()}`;

  return (
    <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
      <p className="text-[10px] font-semibold uppercase text-[#64748b]">Contributor Wallet</p>
      <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">{roleLabel} 수익</h2>
      <p className="mt-1 text-[12px] text-[#64748b]">
        Capability Execution + Reality Data Network — Contributor Ledger SSOT
      </p>

      {loading ? (
        <p className="mt-6 text-[12px] text-[#94a3b8]">지갑 불러오는 중…</p>
      ) : !wallet ? (
        <p className="mt-6 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-[12px] text-[#64748b]">
          지갑을 불러오지 못했습니다. Dev sandbox에서는 제출·검수 후 다시 확인해 주세요.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="총 수익" value={fmt(wallet.totalCombinedKrw)} sub="RDN + Capability" />
            <StatCard
              label="데이터 제출"
              value={fmt(wallet.unified.dataSubmissionKrw)}
            />
            <StatCard
              label="검수"
              value={fmt(wallet.unified.humanVerificationKrw)}
            />
            <StatCard
              label="사업자 공급"
              value={fmt(wallet.unified.businessSupplyKrw ?? 0)}
            />
            <StatCard
              label="Capability (대기)"
              value={fmt(wallet.capabilityWallet.pendingPayoutKrw)}
              sub={`실행 ${wallet.capabilityWallet.executionCount}건`}
            />
          </div>

          <section className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <h3 className="text-[13px] font-semibold text-[#334155]">최근 지급</h3>
            {wallet.entries.length === 0 ? (
              <p className="mt-3 text-[12px] text-[#94a3b8]">아직 ledger 항목 없음</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {wallet.entries.slice(0, 12).map((entry) => (
                  <li
                    key={entry.entryId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[#0f172a]">
                        {entry.summaryKo}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">
                        {KIND_LABEL[entry.kind]} ·{" "}
                        {new Date(entry.timestamp).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold text-emerald-700">
                      +{fmt(entry.amountKrw)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
