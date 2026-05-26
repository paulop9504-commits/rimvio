import { Suspense } from "react";
import { ActionFeed } from "@/components/action-feed";
import { ActionCardSkeletonList } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

export default function InboxPage() {
  return (
    <AppShell title="Inbox" subtitle="카테고리별 전체 목록">
      <Suspense fallback={<ActionCardSkeletonList count={3} />}>
        <ActionFeed />
      </Suspense>
    </AppShell>
  );
}
