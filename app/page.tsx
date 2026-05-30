import { Suspense } from "react";
import { ActionShorts } from "@/components/action-shorts";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function Home() {
  const copy = await getServerCopy();
  return (
    <AppShell title={copy.feed.title} subtitle={copy.feed.subtitle} immersive hideBranding>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionShorts />
      </Suspense>
    </AppShell>
  );
}
