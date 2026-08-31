"use client";

import type { BusinessSupplyRecord, ContributorProfile } from "@/lib/reality-data-network/types";
import type { DataBusinessPane } from "@/lib/hub/data/business-workspace-nav";
import { HubContributorWalletPanel } from "@/components/hub/wallet/hub-contributor-wallet-panel";
import type { ContributorWalletSnapshot } from "@/lib/hub/wallet/fetch-contributor-wallet";
import { HubDataDemoBadge } from "@/components/hub/data/hub-data-shell";

type HubDataBusinessPanelProps = {
  readonly pane: DataBusinessPane;
  readonly profile: ContributorProfile | null;
  readonly supplies: readonly BusinessSupplyRecord[];
  readonly wallet: ContributorWalletSnapshot | null;
  readonly walletLoading?: boolean;
  readonly onSubmit: (input: {
    kind: BusinessSupplyRecord["kind"];
    targetLabelKo: string;
    payload: Readonly<Record<string, unknown>>;
  }) => void;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-[#0f172a]">{value}</p>
    </div>
  );
}

export function HubDataBusinessPanel({
  pane,
  profile,
  supplies,
  wallet,
  walletLoading,
  onSubmit,
}: HubDataBusinessPanelProps) {
  if (pane === "overview") {
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-semibold uppercase text-[#64748b]">Business</p>
          <HubDataDemoBadge />
        </div>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">사업자 공급</h2>
        <p className="mt-1 text-[12px] text-[#64748b]">
          호텔·식당 사업자가 재고 · 가격 · 정책 · 사진 · 영업시간을 직접 공급합니다.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="공급 건수" value={String(supplies.length)} />
          <StatCard
            label="누적 수익"
            value={`₩${(wallet?.totalCombinedKrw ?? profile?.totalEarnedKrw ?? 0).toLocaleString()}`}
          />
          <StatCard label="역할" value="Business Contributor" />
        </div>
      </div>
    );
  }

  if (pane === "inventory" || pane === "pricing" || pane === "policy") {
    const kind =
      pane === "inventory" ? "inventory" : pane === "pricing" ? "price" : "policy";
    const title =
      pane === "inventory" ? "재고 · 객실" : pane === "pricing" ? "가격" : "정책 · 시설";
    return (
      <div className="overflow-y-auto bg-[#f8fafc] p-6 rimvio-scroll-touch">
        <p className="text-[10px] font-semibold uppercase text-[#64748b]">{pane}</p>
        <h2 className="mt-1 text-[18px] font-bold text-[#0f172a]">{title} 업데이트</h2>
        <form
          className="mt-6 max-w-lg space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onSubmit({
              kind,
              targetLabelKo: String(fd.get("target") ?? ""),
              payload: {
                value: String(fd.get("value") ?? ""),
                note: String(fd.get("note") ?? ""),
              },
            });
            e.currentTarget.reset();
          }}
        >
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">대상 (호텔 · 메뉴)</span>
            <input
              name="target"
              required
              placeholder="오사카 ○○호텔 · 디럭스 더블"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">값</span>
            <input
              name="value"
              required
              placeholder={pane === "pricing" ? "₩120,000 / 1박" : "3실 잔여"}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-medium text-[#334155]">메모</span>
            <input
              name="note"
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[13px]"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-sky-600 py-2.5 text-[13px] font-semibold text-white hover:bg-sky-700"
          >
            Verified Reality 공급 경로에 제출
          </button>
        </form>
        <ul className="mt-6 space-y-2">
          {supplies
            .filter((s) => s.kind === kind)
            .map((s) => (
              <li
                key={s.supplyId}
                className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-[12px]"
              >
                <p className="font-medium text-[#0f172a]">{s.targetLabelKo}</p>
                <p className="text-[#64748b]">{JSON.stringify(s.payload)}</p>
              </li>
            ))}
        </ul>
      </div>
    );
  }

  if (pane === "earnings") {
    return (
      <HubContributorWalletPanel
        roleLabel="사업자"
        wallet={wallet}
        loading={walletLoading}
      />
    );
  }

  return null;
}
