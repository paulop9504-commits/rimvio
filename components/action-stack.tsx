import { Suspense } from "react";
import { ActionStackList } from "@/components/action-stack-list";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionStack() {
  const links = await fetchLinks();

  return (
    <RealtimeLinksProvider initialLinks={links}>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionStackList />
      </Suspense>
    </RealtimeLinksProvider>
  );
}
