import { Suspense } from "react";
import { ActionShortsFeed } from "@/components/action-shorts-feed";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionShorts() {
  const links = await fetchLinks();

  return (
    <RealtimeLinksProvider initialLinks={links}>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionShortsFeed />
      </Suspense>
    </RealtimeLinksProvider>
  );
}
