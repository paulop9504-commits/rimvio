import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { PinOpenInitialPage } from "@/lib/globe/resolve-pin-open-initial-page";

export type ContextTriggerOpenOptions = {
  openSheet?: boolean;
  mapTap?: boolean;
  sheetPage?: PinOpenInitialPage;
};

/** Recall trigger tap → map shorts replay or pin sheet. */
export function resolveContextTriggerOpenOptions(
  trigger: Pick<GlobeContextTrigger, "kind" | "mediaPreviews">,
): ContextTriggerOpenOptions {
  const hasMedia = (trigger.mediaPreviews?.length ?? 0) > 0;

  if (hasMedia) {
    return { openSheet: false, mapTap: true };
  }

  switch (trigger.kind) {
    case "person_recall":
      return { openSheet: true, mapTap: false, sheetPage: "context" };
    case "travel_recall":
    case "place_recall":
    case "time_recall":
      return { openSheet: false, mapTap: true };
    default:
      return { openSheet: false, mapTap: true };
  }
}
