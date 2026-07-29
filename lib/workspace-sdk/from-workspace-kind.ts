import { copy } from "@/lib/copy/human-ko";
import { buildWorkspaceSdkFrame } from "@/lib/workspace-sdk/build-workspace-sdk-frame";
import type { WorkspaceSdkFrame, WorkspaceSdkKind } from "@/lib/workspace-sdk/types";
import type {
  WorkspaceFocusSurface,
  WorkspaceKind,
  WorkspacePrepCardModel,
} from "@/lib/workspace-kind/types";

export function workspaceKindToSdkKind(
  kind: WorkspaceKind,
): WorkspaceSdkKind {
  return kind;
}

function openTogetherHint(kind: WorkspaceKind, utterance?: string): string {
  if (kind === "travel") {
    return copy.globe.workspaceOpenTogether;
  }
  if (kind === "driver") {
    return copy.globe.workspaceOpenTogetherDriver;
  }
  if (kind === "used_goods") {
    const text = utterance?.trim() ?? "";
    if (text && /(?:삽니다|구합니다|구해|구매|구입|살만|사줄|찾아)/u.test(text)) {
      return copy.globe.workspaceOpenTogetherMarketBuy;
    }
    return copy.globe.workspaceOpenTogetherMarket;
  }
  return copy.globe.workspaceOpenTogetherGeneric;
}

export function buildSdkFrameFromPrep(input: {
  readonly card: WorkspacePrepCardModel;
  readonly focus?: WorkspaceFocusSurface | null;
}): WorkspaceSdkFrame {
  const focus = input.focus;
  return buildWorkspaceSdkFrame({
    kind: workspaceKindToSdkKind(input.card.kind),
    headerTitleKo: input.card.titleKo,
    contextEventId: input.card.contextEventId,
    focusSlotId: focus?.focusSlotId ?? input.card.focusSlotId,
    focusLabelKo: focus?.focusLabelKo ?? undefined,
    aiStripHintKo: openTogetherHint(input.card.kind, input.card.utterance),
    lifecycle: "prepared",
  });
}
