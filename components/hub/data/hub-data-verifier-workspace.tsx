"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HubDataSidebar, HubDataTopbar } from "@/components/hub/data/hub-data-shell";
import { HubDataVerifierPanel } from "@/components/hub/data/hub-data-verifier-panel";
import {
  DATA_VERIFIER_NAV,
  parseDataVerifierPane,
  type DataVerifierPane,
} from "@/lib/hub/data/data-workspace-nav";
import {
  fetchContributorWallet,
  type ContributorWalletSnapshot,
} from "@/lib/hub/wallet/fetch-contributor-wallet";
import {
  applyVerifierApplication,
  applyVerifierResponse,
  getContributorProfile,
  notifyRdnStoreUpdated,
  readRealityTasks,
  readVerifierResponses,
  RDN_STORE_UPDATED,
} from "@/lib/reality-data-network";

const DEMO_VERIFIER_ID = "verifier-demo";

export function HubDataVerifierWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pane, setPane] = useState<DataVerifierPane>(() =>
    parseDataVerifierPane(searchParams.get("pane")),
  );
  const [tasks, setTasks] = useState(readRealityTasks);
  const [responses, setResponses] = useState(readVerifierResponses);
  const [profile, setProfile] = useState(() => getContributorProfile(DEMO_VERIFIER_ID));
  const [wallet, setWallet] = useState<ContributorWalletSnapshot | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    setWalletLoading(true);
    const snap = await fetchContributorWallet(DEMO_VERIFIER_ID);
    setWallet(snap);
    setWalletLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setTasks(readRealityTasks());
    setResponses(readVerifierResponses());
    setProfile(getContributorProfile(DEMO_VERIFIER_ID));
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
    (next: DataVerifierPane) => {
      setPane(next);
      router.replace(`/hub/data/verifier?pane=${next}`);
    },
    [router],
  );

  const handleApply = useCallback(() => {
    applyVerifierApplication({
      contributorId: DEMO_VERIFIER_ID,
      displayName: "검수자 A",
    });
    notifyRdnStoreUpdated();
    refresh();
  }, [refresh]);

  const handleReview = useCallback(
    (taskId: string, answerId: string, answerLabelKo: string) => {
      try {
        applyVerifierResponse({
          taskId,
          verifierId: DEMO_VERIFIER_ID,
          answerId,
          answerLabelKo,
        });
        notifyRdnStoreUpdated();
        void refreshWallet();
      } catch {
        // already responded
      }
    },
    [refreshWallet],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#111827]">
      <HubDataTopbar role="verifier" displayName={profile?.displayName} />
      <div className="flex min-h-0 flex-1">
        <HubDataSidebar
          sectionLabel="지원자 · 검수"
          items={DATA_VERIFIER_NAV}
          active={pane}
          onSelect={setPaneAndUrl}
        />
        <main className="min-w-0 flex-1">
          <HubDataVerifierPanel
            pane={pane}
            profile={profile}
            tasks={tasks}
            responses={responses}
            wallet={wallet}
            walletLoading={walletLoading}
            onApply={handleApply}
            onReview={handleReview}
          />
        </main>
      </div>
    </div>
  );
}
