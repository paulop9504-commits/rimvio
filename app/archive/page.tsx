import { ArchiveFeedList } from "@/components/archive-feed-list";
import { AppShell } from "@/components/app-shell";
import { RealtimeLinksProvider } from "@/hooks/use-realtime-links";
import { fetchLinks } from "@/lib/data/fetch-links";

export default async function ArchivePage() {
  const links = await fetchLinks();

  return (
    <AppShell title="보관함" subtitle="TTL이 지난 링크">
      <RealtimeLinksProvider initialLinks={links}>
        <ArchiveFeedList />
      </RealtimeLinksProvider>
    </AppShell>
  );
}
