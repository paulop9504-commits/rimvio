import { AppShell } from "@/components/app-shell";
import { FivePeerHubClient } from "@/components/peer-chat/five-peer-hub-client";

export default function FivePeerHubPage() {
  return (
    <AppShell
      title="친한 친구"
      subtitle="친구 무제한 · AI 핀 5"
      compact
      iosSurface
    >
      <FivePeerHubClient />
    </AppShell>
  );
}
