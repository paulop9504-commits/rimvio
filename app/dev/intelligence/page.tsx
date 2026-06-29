import { AppShell } from "@/components/app-shell";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { DevSurfaceShell } from "@/components/dev/dev-surface-shell";
import { GoalAlignmentPanel } from "@/components/dev/goal-alignment-panel";
import { OpportunityScoresPanel } from "@/components/dev/opportunity-scores-panel";
import { SelfLearningSummaryPanel } from "@/components/dev/self-learning-summary-panel";
import { PmfMetricsPanel } from "@/components/pmf-metrics-panel";
import { requireDevPage } from "@/lib/dev/require-dev-page";

export default function DevIntelligencePage() {
  requireDevPage();

  return (
    <AppShell title="Dev Intelligence" subtitle="PMF · engines · dev-only">
      <DevSurfaceShell
        active="intelligence"
        title="Dev Intelligence"
        subtitle="PMF · opportunity · goal · analytics — Field와 분리"
      >
        <div className="space-y-6">
          <PmfMetricsPanel />
          <div className="grid gap-6 xl:grid-cols-2">
            <OpportunityScoresPanel />
            <GoalAlignmentPanel />
          </div>
          <SelfLearningSummaryPanel />
          <AnalyticsPanel />
        </div>
      </DevSurfaceShell>
    </AppShell>
  );
}
