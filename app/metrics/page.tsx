import { AppShell } from "@/components/app-shell";
import { ContextOpsDashboard } from "@/components/context-ops/context-ops-dashboard";
import { DevSurfaceShell } from "@/components/dev/dev-surface-shell";
import { requireDevPage } from "@/lib/dev/require-dev-page";

export default function MetricsPage() {
  requireDevPage();

  return (
    <AppShell title="Context Ops" subtitle="Pipeline observability · dev-only">
      <DevSurfaceShell
        active="context-ops"
        title="Context Ops"
        subtitle="EventCandidate · recall · people graph · projection health"
      >
        <ContextOpsDashboard />
      </DevSurfaceShell>
    </AppShell>
  );
}
