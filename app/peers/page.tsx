import { AppShell } from "@/components/app-shell";
import { FivePeerHubClient } from "@/components/peer-chat/five-peer-hub-client";

export default function FivePeerHubPage() {
  return (
    <AppShell
      title="관계 버블"
      subtitle="항상 보이는 5명 · 나머지는 아카이브"
      compact
      iosSurface
    >
      <FivePeerHubClient />
    </AppShell>
  );
}
