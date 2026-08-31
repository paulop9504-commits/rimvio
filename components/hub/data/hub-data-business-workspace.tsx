"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HubDataSidebar, HubDataTopbar } from "@/components/hub/data/hub-data-shell";
import { HubDataBusinessPanel } from "@/components/hub/data/hub-data-business-panel";
import {
  DATA_BUSINESS_NAV,
  parseDataBusinessPane,
  type DataBusinessPane,
} from "@/lib/hub/data/business-workspace-nav";
import {
  fetchContributorWallet,
  type ContributorWalletSnapshot,
} from "@/lib/hub/wallet/fetch-contributor-wallet";
import {
  readBusinessSupplies,
  submitBusinessSupply,
} from "@/lib/hub/data/business-supply";
import {
  getContributorProfile,
  notifyRdnStoreUpdated,
  RDN_STORE_UPDATED,
} from "@/lib/reality-data-network";

const DEMO_BUSINESS_ID = "business-demo";

export function HubDataBusinessWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pane, setPane] = useState<DataBusinessPane>(() =>
    parseDataBusinessPane(searchParams.get("pane")),
  );
  const [supplies, setSupplies] = useState(readBusinessSupplies);
  const [wallet, setWallet] = useState<ContributorWalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const profile = getContributorProfile(DEMO_BUSINESS_ID);

  const refreshWallet = useCallback(async () => {
    setWalletLoading(true);
    const snap = await fetchContributorWallet(DEMO_BUSINESS_ID);
    setWallet(snap);
    setWalletLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setSupplies(readBusinessSupplies());
  }, []);

  useEffect(() => {
    refresh();
    void refreshWallet();
    const onUpdate = () => {
      refresh();
      void refreshWallet();
    };
    window.addEventListener(RDN_STORE_UPDATED, onUpdate);
    return () => window.removeEventListener(RDN_STORE_UPDATED, onUpdate);
  }, [refresh, refreshWallet]);

  const setPaneAndUrl = useCallback(
    (next: DataBusinessPane) => {
      setPane(next);
      router.replace(`/hub/data/business?pane=${next}`);
    },
    [router],
  );

  const handleSubmit = useCallback(
    (input: {
      kind: Parameters<typeof submitBusinessSupply>[0]["kind"];
      targetLabelKo: string;
      payload: Readonly<Record<string, unknown>>;
    }) => {
      submitBusinessSupply({
        businessId: DEMO_BUSINESS_ID,
        businessLabel: profile?.displayName ?? "○○호텔",
        domain: "lodging",
        kind: input.kind,
        targetLabelKo: input.targetLabelKo,
        payload: input.payload,
      });
      notifyRdnStoreUpdated();
      refresh();
      void refreshWallet();
    },
    [profile?.displayName, refresh, refreshWallet],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#111827]">
      <HubDataTopbar role="business" displayName={profile?.displayName ?? "사업자"} />
      <div className="flex min-h-0 flex-1">
        <HubDataSidebar
          sectionLabel="사업자"
          items={DATA_BUSINESS_NAV}
          active={pane}
          onSelect={setPaneAndUrl}
        />
        <main className="min-w-0 flex-1">
          <HubDataBusinessPanel
            pane={pane}
            profile={profile}
            supplies={supplies}
            wallet={wallet}
            walletLoading={walletLoading}
            onSubmit={handleSubmit}
          />
        </main>
      </div>
    </div>
  );
}
