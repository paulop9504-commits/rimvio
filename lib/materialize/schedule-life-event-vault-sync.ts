import type { EventCandidate } from "@/lib/events/event-candidate";
import { enqueueLifeEventVaultSync } from "@/lib/materialize/enqueue-life-event-vault-sync";
import { MATERIALIZE_UPDATED } from "@/lib/materialize/materialize-db";

function emitMaterializeUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MATERIALIZE_UPDATED));
  }
}

/** Client-only — queue vault mirror after SSOT commit (online flush handles upload). */
export function scheduleLifeEventVaultSync(event: EventCandidate): void {
  if (typeof window === "undefined") {
    return;
  }

  void enqueueLifeEventVaultSync(event)
    .then(() => {
      emitMaterializeUpdated();
    })
    .catch(() => {
      /* offline — retry on next commit or interval flush */
    });
}
