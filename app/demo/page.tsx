import { AppShell } from "@/components/app-shell";
import { DemoLauncher } from "@/components/demo-launcher";
import { AnalyticsPanel } from "@/components/analytics-panel";

export default function DemoPage() {
  return (
    <AppShell title="Demo" subtitle="Blink 미리보기">
      <AnalyticsPanel />
      <DemoLauncher />
    </AppShell>
  );
}
