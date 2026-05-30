import { AppShell } from "@/components/app-shell";
import { DemoLauncher } from "@/components/demo-launcher";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { GLANGO } from "@/lib/brand/glango";

export default function DemoPage() {
  return (
    <AppShell title="Demo" subtitle={`${GLANGO.name} 미리보기`}>
      <AnalyticsPanel />
      <DemoLauncher />
    </AppShell>
  );
}
