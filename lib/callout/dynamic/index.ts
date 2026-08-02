/**
 * Dynamic Callout System — Reality Object Control Surface (STEP 8)
 *
 * Object + Context + Intent + Agent State → UI Schema
 * States: Discover · Analyze · Compare · Simulate · Prepare · Commit
 * fixedUi forbidden · Commit in Callout = Field handoff schema only
 */

export type {
  CalloutUiAction,
  CalloutUiBlock,
  CalloutUiBlockKind,
  DynamicCalloutAgentState,
  DynamicCalloutCompare,
  DynamicCalloutContext,
  DynamicCalloutInput,
  DynamicCalloutIntent,
  DynamicCalloutObject,
  DynamicCalloutSchema,
  DynamicCalloutState,
} from "@/lib/callout/dynamic/types";

export {
  CALLOUT_UI_BLOCK_KINDS,
  DYNAMIC_CALLOUT_STATES,
} from "@/lib/callout/dynamic/types";

export {
  isDynamicCalloutState,
  resolveDynamicCalloutState,
} from "@/lib/callout/dynamic/resolve-state";

export {
  buildDynamicCalloutSchema,
  formatDynamicCalloutUxKo,
} from "@/lib/callout/dynamic/build-ui-schema";

export {
  buildDynamicCallout,
  dynamicObjectFromRimvio,
  schemasForSameObjectAcrossStates,
} from "@/lib/callout/dynamic/runtime";
