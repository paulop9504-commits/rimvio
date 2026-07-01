import {
  iosPwaOverlayOpenDelayMs,
  shouldUseIosPwaMemoryGuards,
} from "@/lib/platform/ios-pwa-memory";
import {
  subscribeOpenFieldSheet,
  type FieldSheetOpenRequest,
} from "@/lib/nav/field-sheet-bridge";

let openTimer: ReturnType<typeof setTimeout> | null = null;

export function requestOpenFieldSheet(
  apply: (request?: FieldSheetOpenRequest) => void,
  request?: FieldSheetOpenRequest,
): void {
  if (openTimer != null) {
    clearTimeout(openTimer);
    openTimer = null;
  }

  const delay = iosPwaOverlayOpenDelayMs();
  if (delay <= 0) {
    apply(request);
    return;
  }

  openTimer = setTimeout(() => {
    openTimer = null;
    apply(request);
  }, delay);
}

export function bindLegacyOpenFieldSheet(
  apply: (request?: FieldSheetOpenRequest) => void,
): () => void {
  return subscribeOpenFieldSheet((request) => {
    requestOpenFieldSheet(apply, request);
  });
}

export function resetOpenFieldSheetTimersForTests(): void {
  if (openTimer != null) {
    clearTimeout(openTimer);
    openTimer = null;
  }
}

export { shouldUseIosPwaMemoryGuards };
