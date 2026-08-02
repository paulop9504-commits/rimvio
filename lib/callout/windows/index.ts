/**
 * Callout Windows — Floating Reality Object Control Surfaces (UI state).
 */

export type {
  CalloutWindow,
  CalloutWindowMode,
  CalloutWindowPosition,
  CalloutWindowSize,
} from "@/lib/callout/windows/types";

export {
  CALLOUT_WINDOW_COMPACT_SIZE,
  CALLOUT_WINDOW_DEFAULT_SIZE,
  CALLOUT_WINDOW_MAX,
  CALLOUT_WINDOW_MODES,
  CALLOUT_WINDOW_SCALE_MAX,
  CALLOUT_WINDOW_SCALE_MIN,
} from "@/lib/callout/windows/types";

export {
  clearAllCalloutWindows,
  clearCalloutWindowsForTests,
  closeCalloutWindow,
  findCalloutWindowByEntity,
  focusCalloutWindow,
  getCalloutWindowsSnapshot,
  getFocusedCalloutWindowId,
  listActiveCalloutWindows,
  openCalloutWindow,
  openCalloutWindowsFromAgent,
  readCalloutWindow,
  setCalloutWindowMode,
  subscribeCalloutWindows,
  updateCalloutWindowLayout,
} from "@/lib/callout/windows/store";
