/** Soft yes / no after lodging stay revise ask_chips. */

import {
  isSoftConfirmAffirmUtterance,
  isSoftConfirmRejectUtterance,
} from "@/lib/globe/soft-confirm/soft-confirm-affirm";

export function isLodgingStayReviseAffirmUtterance(text: string): boolean {
  return isSoftConfirmAffirmUtterance(text);
}

export function isLodgingStayReviseRejectUtterance(text: string): boolean {
  return isSoftConfirmRejectUtterance(text);
}
