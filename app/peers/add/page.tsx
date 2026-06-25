import { AppShell } from "@/components/app-shell";
import { PeerAddDeepLinkClient } from "@/components/peer-chat/peer-add-deep-link-client";
import { Suspense } from "react";

export default function PeerAddPage() {
  return (
    <AppShell title="친구 추가" compact iosSurface>
      <Suspense fallback={null}>
        <PeerAddDeepLinkClient />
      </Suspense>
    </AppShell>
  );
}
