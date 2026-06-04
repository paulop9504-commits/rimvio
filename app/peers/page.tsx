import { AppShell } from "@/components/app-shell";
import { FivePeerHubClient } from "@/components/peer-chat/five-peer-hub-client";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function FivePeerHubPage() {
  const copy = await getServerCopy();
  return (
    <AppShell
      title={copy.peers.title}
      subtitle={copy.peers.subtitle}
      compact
      iosSurface
    >
      <FivePeerHubClient />
    </AppShell>
  );
}
