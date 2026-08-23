import type { InlineChatBookingDraftWire } from "@/lib/jarvis-in-app-booking/inline-chat-booking-draft";

export type PendingInAppBooking = {
  readonly messageId: string;
  readonly wire: InlineChatBookingDraftWire;
};

let pending: PendingInAppBooking | null = null;

export function setPendingInAppBooking(next: PendingInAppBooking | null): void {
  pending = next;
}

export function readPendingInAppBooking(): PendingInAppBooking | null {
  return pending;
}

export function clearPendingInAppBooking(): void {
  pending = null;
}
