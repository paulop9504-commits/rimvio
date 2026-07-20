export type BookingProviderId =
  | "demo_stub"
  | "google_maps_reserve"
  | "liteapi_booking";

export type BookingCommitStatus =
  | "confirmed"
  | "handoff"
  | "pending_payment";

export type BookingCommitReceipt = {
  readonly operationId: string;
  readonly placeId: string | null;
  readonly placeName: string;
  readonly provider: BookingProviderId;
  readonly confirmationCode: string;
  readonly status: BookingCommitStatus;
  readonly handoffUrl?: string | null;
  readonly committedAtIso: string;
  readonly meta?: Readonly<Record<string, string>>;
};

export type BookingExecuteInput = {
  readonly contextEventId: string;
  readonly operations: readonly import("@/lib/reality-queue/types").RealityOperationV1[];
  readonly approvedByHuman: boolean;
  readonly identityBundle?: import("@/lib/identity-vault/types").IdentityVaultBundle | null;
};

export type BookingExecuteResult =
  | { readonly ok: true; readonly receipts: readonly BookingCommitReceipt[] }
  | { readonly ok: false; readonly reasonKo: string };
