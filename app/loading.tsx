import { copy } from "@/lib/copy/human-ko";
import { GlangoLogo } from "@/components/glango-logo";
import { AppShell } from "@/components/app-shell";

export default function Loading() {
  return (
    <AppShell title={copy.app.loadingTitle} subtitle={copy.app.loadingSubtitle}>
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <GlangoLogo size="lg" framed className="animate-pulse" />
        <p className="text-sm text-muted-foreground">{copy.app.loadingSubtitle}</p>
      </div>
    </AppShell>
  );
}
