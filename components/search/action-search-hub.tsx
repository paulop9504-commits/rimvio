"use client";

import { ActionChatFeed } from "@/components/action-chat-feed";
import { SpacetimeTargetSheet } from "@/components/search/spacetime-target-sheet";
import { useSearchCaptureIngest } from "@/hooks/use-search-capture-ingest";
import { useCopy } from "@/hooks/use-copy";

/** 검색 탭 — 사진·링크·메모를 Feed Event에 자동 귀속. */
export function ActionSearchHub() {
  const copy = useCopy();
  const {
    ingesting,
    targetSheet,
    ingestFile,
    ingestMemo,
    confirmTargetMatch,
    createPlanTarget,
    dismissTargetSheet,
  } = useSearchCaptureIngest();

  return (
    <>
      <ActionChatFeed
        variant="conversation"
        scopeKind="search"
        links={[]}
        activeIndex={-1}
        onSelectIndex={() => {}}
        onOpenLinkPaste={() => {}}
        onQuickCapture={(file) => {
          void ingestFile(file);
        }}
        onSearchMemoIngest={async (text) => ingestMemo(text)}
        searchIngesting={ingesting}
        className="min-h-0 flex-1"
        searchIngressHint={copy.search.ingressHint}
      />

      <SpacetimeTargetSheet
        state={targetSheet}
        onConfirmMatch={confirmTargetMatch}
        onCreatePlan={createPlanTarget}
        onDismiss={dismissTargetSheet}
      />
    </>
  );
}
