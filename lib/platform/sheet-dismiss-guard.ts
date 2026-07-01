import { useCallback, useEffect, useRef } from "react";

/** Ignore backdrop dismiss right after open — bottom-nav tap bleeds through. */
export const RIMVIO_SHEET_DISMISS_GUARD_MS = 480;

export function useRimvioSheetDismissGuard(
  open: boolean,
  resetToken = 0,
): (dismiss: () => void) => void {
  const openedAtRef = useRef(0);

  useEffect(() => {
    if (open) {
      openedAtRef.current = Date.now();
    }
  }, [open, resetToken]);

  return useCallback(
    (dismiss: () => void) => {
      if (!open) {
        return;
      }
      if (Date.now() - openedAtRef.current < RIMVIO_SHEET_DISMISS_GUARD_MS) {
        return;
      }
      dismiss();
    },
    [open],
  );
}
