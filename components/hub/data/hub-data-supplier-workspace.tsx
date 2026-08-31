"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HubDataSidebar, HubDataTopbar } from "@/components/hub/data/hub-data-shell";
import { HubDataSupplierPanel } from "@/components/hub/data/hub-data-supplier-panel";
import {
  DATA_SUPPLIER_NAV,
  parseDataSupplierPane,
  type DataSupplierPane,
} from "@/lib/hub/data/data-workspace-nav";
import {
  fetchContributorWallet,
  type ContributorWalletSnapshot,
} from "@/lib/hub/wallet/fetch-contributor-wallet";
import {
  getContributorProfile,
  notifyRdnStoreUpdated,
  readDataSubmissions,
  readRealityTasks,
  RDN_STORE_UPDATED,
  submitRealityData,
} from "@/lib/reality-data-network";
import type { RealityTaskType } from "@/lib/reality-data-network";

const DEMO_SUPPLIER_ID = "supplier-demo";

export function HubDataSupplierWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pane, setPane] = useState<DataSupplierPane>(() =>
    parseDataSupplierPane(searchParams.get("pane")),
  );
  const [tasks, setTasks] = useState(readRealityTasks);
  const [submissions, setSubmissions] = useState(readDataSubmissions);
  const [wallet, setWallet] = useState<ContributorWalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const profile = getContributorProfile(DEMO_SUPPLIER_ID);

  const refreshWallet = useCallback(async () => {
    setWalletLoading(true);
    const snap = await fetchContributorWallet(DEMO_SUPPLIER_ID);
    setWallet(snap);
    setWalletLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setTasks(readRealityTasks());
    setSubmissions(readDataSubmissions());
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
    (next: DataSupplierPane) => {
      setPane(next);
      router.replace(`/hub/data/supplier?pane=${next}`);
    },
    [router],
  );

  const handleSubmit = useCallback(
    (input: { titleKo: string; targetLabelKo: string; taskType: RealityTaskType }) => {
      submitRealityData({
        supplierId: DEMO_SUPPLIER_ID,
        supplierLabel: profile?.displayName ?? "공급자",
        titleKo: input.titleKo,
        targetLabelKo: input.targetLabelKo,
        domain: "lodging",
        taskType: input.taskType,
        preLabel: {
          domain: "lodging",
          titleKo: input.titleKo,
          targetLabelKo: input.targetLabelKo,
          visionLabels: ["double bed", "bathtub", "city view"],
        },
      });
      notifyRdnStoreUpdated();
      setPaneAndUrl("submissions");
    },
    [profile?.displayName, setPaneAndUrl],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#111827]">
      <HubDataTopbar role="supplier" displayName={profile?.displayName} />
      <div className="flex min-h-0 flex-1">
        <HubDataSidebar
          sectionLabel="공급자"
          items={DATA_SUPPLIER_NAV}
          active={pane}
          onSelect={setPaneAndUrl}
        />
        <main className="min-w-0 flex-1">
          <HubDataSupplierPanel
            pane={pane}
            profile={profile}
            tasks={tasks}
            submissions={submissions}
            wallet={wallet}
            walletLoading={walletLoading}
            onSubmit={handleSubmit}
          />
        </main>
      </div>
    </div>
  );
}
