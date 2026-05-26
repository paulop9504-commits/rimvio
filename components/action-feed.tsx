import { ActionFeedList } from "@/components/action-feed-list";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { fetchLinks } from "@/lib/data/fetch-links";

export async function ActionFeed() {
  const links = await fetchLinks();

  return (
    <RealtimeLinksProvider initialLinks={links}>
      <ActionFeedList />
    </RealtimeLinksProvider>
  );
}
