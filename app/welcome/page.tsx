import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { WelcomeGuide } from "@/components/welcome-guide";
import { GLANGO } from "@/lib/brand/glango";

export default function WelcomePage() {
  return (
    <AppShell title={`${GLANGO.name} 시작하기`} compact iosSurface>
      <Suspense fallback={null}>
        <WelcomeGuide />
      </Suspense>
    </AppShell>
  );
}
