import { AppShell } from "@/components/app-shell";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { ContextOpsPanel } from "@/components/context-ops/context-ops-panel";
import { PmfMetricsPanel } from "@/components/pmf-metrics-panel";

export default function MetricsPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <AppShell title="Metrics" subtitle="Dev surface">
        <p className="text-sm text-muted-foreground">
          Context Ops는 development 환경에서만 사용할 수 있어요.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Metrics" subtitle="Context Ops · PMF · dev surface">
      <div className="space-y-6">
        <ContextOpsPanel />
        <PmfMetricsPanel />
        <AnalyticsPanel />
      </div>
    </AppShell>
  );
}
