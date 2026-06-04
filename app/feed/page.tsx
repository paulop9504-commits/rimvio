import { Suspense } from "react";
import { ActionShorts } from "@/components/action-shorts";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";
import { RimvioProductContextStrip } from "@/components/rimvio-product-context-strip";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function FeedPage() {
  const copy = await getServerCopy();
  return (
    <AppShell title={copy.feed.title} subtitle={copy.feed.subtitle} immersive hideBranding>
      <div className="pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top,0px)] z-20 flex justify-center px-3 pt-2">
        <RimvioProductContextStrip
          variant="feed"
          className="pointer-events-auto max-w-md shadow-lg"
        />
      </div>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionShorts />
      </Suspense>
    </AppShell>
  );
}
