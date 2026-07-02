import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AgentNegotiationRoomClient } from "@/components/market/agent-negotiation-room-client";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function AgentNegotiationRoomPage({
  params,
}: {
  params: Promise<{ handshakeId: string }>;
}) {
  const { handshakeId } = await params;
  const copy = await getServerCopy();

  return (
    <AppShell
      title={copy.globe.coordination.roomTitle}
      hideBranding
      hideTitle
      compact
      fullBleed
      iosSurface
    >
      <Suspense fallback={null}>
        <AgentNegotiationRoomClient handshakeId={decodeURIComponent(handshakeId)} />
      </Suspense>
    </AppShell>
  );
}
