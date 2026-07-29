/**
 * Build a Workspace SDK frame — always six regions.
 * When a Context Reality bundle exists, Node surface follows progressive projection (ADR-034).
 */

import { copy } from "@/lib/copy/human-ko";
import {
  projectionFromBundle,
  readContextRealityBundle,
} from "@/lib/reality-os";
import { workspaceSdkRecipe } from "@/lib/workspace-sdk/recipes";
import type {
  WorkspaceSdkFrame,
  WorkspaceSdkKind,
  WorkspaceSdkLifecycle,
} from "@/lib/workspace-sdk/types";
import { WORKSPACE_SDK_VERSION } from "@/lib/workspace-sdk/types";

export function buildWorkspaceSdkFrame(input: {
  readonly kind: WorkspaceSdkKind;
  readonly headerTitleKo?: string | null;
  readonly headerSubtitleKo?: string | null;
  readonly contextEventId?: string | null;
  readonly focusSlotId?: string | null;
  readonly focusLabelKo?: string | null;
  readonly aiStripHintKo?: string | null;
  readonly lifecycle?: WorkspaceSdkLifecycle;
}): WorkspaceSdkFrame {
  const recipe = workspaceSdkRecipe(input.kind);
  const focusLabel =
    input.focusLabelKo?.trim() || recipe.focusLabelKo;
  const focusSlotId =
    input.focusSlotId?.trim() || recipe.focusSlotId;
  const contextEventId = input.contextEventId?.trim() || null;

  const bundle = contextEventId
    ? readContextRealityBundle(contextEventId)
    : null;
  const projection = bundle
    ? projectionFromBundle({
        ...bundle,
        focusSlotId: focusSlotId || bundle.focusSlotId,
      })
    : null;

  return {
    version: WORKSPACE_SDK_VERSION,
    kind: input.kind,
    morphologyId: projection?.morphologyId ?? recipe.morphologyId,
    lifecycle: input.lifecycle ?? "focused",
    contextEventId,
    header: {
      titleKo: input.headerTitleKo?.trim() || recipe.defaultHeaderTitleKo,
      subtitleKo: input.headerSubtitleKo?.trim() || null,
      eyebrowKo: copy.globe.workspacePrepEyebrow,
    },
    ai: {
      roleLabelKo: recipe.aiRoleLabelKo,
      promptPlaceholderKo: recipe.aiPromptPlaceholderKo,
      stripHintKo:
        input.aiStripHintKo?.trim() ||
        projection?.progressiveHintKo ||
        null,
    },
    primaryFocus: {
      slotId: focusSlotId,
      labelKo: focusLabel,
      headlineKo: copy.globe.workspaceFocusHeadline(focusLabel),
      askKo: copy.globe.workspaceFocusAsk(focusLabel),
    },
    node: projection
      ? { surface: projection.nodeSurface, labelKo: projection.nodeLabelKo }
      : recipe.node,
    action: recipe.action,
    commit: recipe.commit,
    progressiveHintKo: projection?.progressiveHintKo ?? null,
    activePrimitiveIds: projection?.activePrimitives ?? null,
  };
}

/** Assert frame has all six regions (runtime guard for hosts). */
export function assertWorkspaceSdkFrameComplete(
  frame: WorkspaceSdkFrame,
): boolean {
  return Boolean(
    frame.header?.titleKo &&
      frame.ai?.roleLabelKo &&
      frame.primaryFocus?.slotId &&
      frame.node?.surface &&
      frame.action?.id &&
      frame.commit?.requiresHuman === true &&
      Boolean(frame.morphologyId),
  );
}
