import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { FivePeerHubClient } from "@/components/peer-chat/five-peer-hub-client";
import { PeerChatRouteShimmer } from "@/components/peer-chat/peer-chat-route-shimmer";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function FivePeerHubPage() {
  const copy = await getServerCopy();
  return (
    <AppShell
      title={copy.peers.title}
      hideBranding
      hideTitle
      compact
      fullBleed
      iosSurface
    >
      <Suspense fallback={<PeerChatRouteShimmer variant="hub" />}>
        <FivePeerHubClient />
      </Suspense>
    </AppShell>
  );
}
