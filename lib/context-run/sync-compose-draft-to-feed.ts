import { copy } from "@/lib/copy/human-ko";
import {
  dispatchExecutionFeedArtifact,
  dispatchExecutionFeedGoal,
  dispatchExecutionFeedStep,
} from "@/lib/context-run/execution-feed-bridge";
import type { ExecutionFeedComposeDraftField } from "@/lib/context-run/execution-feed-types";
import {
  composeDraftHasValues,
  sellItemDraftCanPublish,
} from "@/lib/portal/compose-draft/draft-utils";
import { getComposeSchema } from "@/lib/portal/compose-draft/schema-registry";
import type { ComposeSchemaId, SellItemDraft } from "@/lib/portal/compose-draft/types";

const STEP_COMPOSE = "compose_draft";

function formatPriceKrw(value: number | null | undefined): string {
  if (value == null || value < 10_000) {
    return "";
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

function buildComposeDraftFields(
  schemaId: ComposeSchemaId,
  draft: Partial<SellItemDraft>,
): ExecutionFeedComposeDraftField[] {
  const schema = getComposeSchema(schemaId);
  return schema.fields.map((field) => {
    let valueKo = "";
    if (field.id === "priceKrw") {
      valueKo = formatPriceKrw(draft.priceKrw);
    } else {
      const raw = draft[field.id];
      valueKo = typeof raw === "string" ? raw.trim() : raw != null ? String(raw) : "";
    }
    return {
      id: field.id,
      labelKo: field.labelKo,
      valueKo,
      required: field.required,
      inputType: field.inputType,
    };
  });
}

/** Intent only — assistant text, no card artifact. */
export function syncComposeIntentToFeed(input: {
  graphId: string;
  goalKo: string;
  assistantKo: string;
}): void {
  dispatchExecutionFeedGoal({ graphId: input.graphId, goalKo: input.goalKo });
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_COMPOSE,
    labelKo: copy.portal.composeRunStep,
    status: "running",
  });
  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_COMPOSE,
    artifact: {
      kind: "question",
      summaryLineKo: input.assistantKo,
    },
  });
}

/** Draft has values — mount inline card (no step numbers / %). */
export function syncComposeDraftToFeed(input: {
  graphId: string;
  goalKo: string;
  assistantKo: string;
  schemaId: ComposeSchemaId;
  draft: Partial<SellItemDraft>;
  primaryActionLabelKo?: string | null;
}): void {
  const schema = getComposeSchema(input.schemaId);
  const canPublish = sellItemDraftCanPublish(input.draft);

  dispatchExecutionFeedGoal({ graphId: input.graphId, goalKo: input.goalKo });
  dispatchExecutionFeedStep({
    graphId: input.graphId,
    stepId: STEP_COMPOSE,
    labelKo: schema.labelKo,
    status: canPublish ? "waiting_user" : "running",
  });

  if (!composeDraftHasValues(input.draft)) {
    syncComposeIntentToFeed({
      graphId: input.graphId,
      goalKo: input.goalKo,
      assistantKo: input.assistantKo,
    });
    return;
  }

  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_COMPOSE,
    artifact: {
      kind: "compose_draft",
      titleKo: schema.labelKo,
      summaryLineKo: input.assistantKo,
      composeDraft: {
        schemaId: input.schemaId,
        schemaLabelKo: schema.labelKo,
        fields: buildComposeDraftFields(input.schemaId, input.draft),
        canPublish,
      },
      primaryActionLabelKo:
        input.primaryActionLabelKo ??
        (canPublish ? copy.globe.executionFeed.marketFeedQuickListCta : null),
      secondaryActionLabelKo: canPublish
        ? copy.globe.executionFeed.marketFeedWizardCta
        : null,
    },
  });
}

export function patchComposeDraftFieldOnFeed(input: {
  graphId: string;
  schemaId: ComposeSchemaId;
  draft: Partial<SellItemDraft>;
}): void {
  const canPublish = sellItemDraftCanPublish(input.draft);
  const schema = getComposeSchema(input.schemaId);

  dispatchExecutionFeedArtifact({
    graphId: input.graphId,
    stepId: STEP_COMPOSE,
    artifact: {
      kind: "compose_draft",
      titleKo: schema.labelKo,
      composeDraft: {
        schemaId: input.schemaId,
        schemaLabelKo: schema.labelKo,
        fields: buildComposeDraftFields(input.schemaId, input.draft),
        canPublish,
      },
      primaryActionLabelKo: canPublish
        ? copy.globe.executionFeed.marketFeedQuickListCta
        : null,
      secondaryActionLabelKo: canPublish
        ? copy.globe.executionFeed.marketFeedWizardCta
        : null,
    },
  });
}
