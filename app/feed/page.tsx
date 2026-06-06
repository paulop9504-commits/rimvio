import { AppShell } from "@/components/app-shell";
import { FeedPageClient } from "@/components/feed/feed-page-client";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function FeedPage() {
  const copy = await getServerCopy();
  return (
    <AppShell title={copy.feed.title} subtitle={copy.feed.subtitle} compact hideBranding fullBleed>
      <FeedPageClient />
    </AppShell>
  );
}
