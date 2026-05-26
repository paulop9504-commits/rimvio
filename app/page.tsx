import { Suspense } from "react";
import { ActionShorts } from "@/components/action-shorts";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell title="Feed" subtitle="공유한 링크 · 스와이프" immersive>
      <Suspense fallback={<ActionCardSkeleton />}>
        <ActionShorts />
      </Suspense>
    </AppShell>
  );
}
