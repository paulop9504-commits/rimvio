import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { OpportunityFieldPageClient } from "@/components/field/opportunity-field-page-client";
import { copy } from "@/lib/copy/human-ko";

export default function FieldPage() {
  return (
    <AppShell
      title={copy.globe.field.sheetTitle}
      hideBranding
      hideTitle
      compact
      fullBleed
      iosSurface
    >
      <Suspense fallback={null}>
        <OpportunityFieldPageClient />
      </Suspense>
    </AppShell>
  );
}
