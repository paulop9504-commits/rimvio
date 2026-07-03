import { Suspense } from "react";
import { ActionStack } from "@/components/action-stack";
import { ActionCardSkeleton } from "@/components/action-card-skeleton";
import { AppShell } from "@/components/app-shell";
import { requireDevPage } from "@/lib/dev/require-dev-page";

export default function StackPage() {
  requireDevPage();

  return (
    <AppShell title="Stack" subtitle="One card focus">
      <div data-surface="stack-dev">
        <Suspense fallback={<ActionCardSkeleton />}>
          <ActionStack />
        </Suspense>
      </div>
    </AppShell>
  );
}
