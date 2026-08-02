/**
 * Callout Action Registry — buttons from registry only.
 */

export type {
  CalloutActionButton,
  CalloutActionContext,
  CalloutRegistryActionId,
  RegisterCalloutActionInput,
  RegisteredCalloutAction,
} from "@/lib/callout/action-registry/types";

export {
  getRegisteredAction,
  invokeRegisteredAction,
  listAllRegisteredActionsForTests,
  listRegisteredActions,
  registerAction,
  resetCalloutActionRegistryForTests,
  resolveCalloutActionButtons,
} from "@/lib/callout/action-registry/register-action";

export {
  ensureBuiltinCalloutActions,
  reinstallBuiltinCalloutActionsForTests,
} from "@/lib/callout/action-registry/builtin-actions";

import { ensureBuiltinCalloutActions } from "@/lib/callout/action-registry/builtin-actions";

/** Side-effect: builtins available when Callout Action Registry loads. */
ensureBuiltinCalloutActions();
