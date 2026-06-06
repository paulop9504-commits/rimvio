import { AppShell } from "@/components/app-shell";
import { RimvioGlobeHub } from "@/components/experience/rimvio-globe-hub";
import { getServerCopy } from "@/lib/i18n/server-locale";

export default async function GlobePage() {
  const copy = await getServerCopy();

  return (
    <AppShell
      title={copy.globe.title}
      subtitle={copy.globe.subtitle}
      immersive
      hideBranding
      fullBleed
    >
      <RimvioGlobeHub />
    </AppShell>
  );
}
