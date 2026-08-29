/**
 * Schema Preview JSON for ADE workbench — Input / Output invoke preview.
 */

import type { CapabilityAction } from "@/lib/hub/capability/types";

export type DevSchemaPreview = {
  readonly input: Record<string, unknown>;
  readonly output: Record<string, unknown>;
};

function hotelSearchPreview(): DevSchemaPreview {
  return {
    input: {
      destination: "string",
      checkIn: "date",
      checkOut: "date",
      guests: "number",
      filters: { priceMax: "number", ratingMin: "number" },
    },
    output: {
      items: [{ id: "string", name: "string", price: "number", rating: "number" }],
      total: "number",
    },
  };
}

function paymentCommitPreview(): DevSchemaPreview {
  return {
    input: {
      bookingId: "string",
      amount: "number",
      currency: "string",
    },
    output: {
      transactionId: "string",
      status: "confirmed | failed",
      receiptUrl: "string",
    },
  };
}

function bookingConfirmPreview(): DevSchemaPreview {
  return {
    input: {
      hotelId: "string",
      roomId: "string",
      guests: "number",
      checkIn: "date",
      checkOut: "date",
    },
    output: {
      bookingId: "string",
      status: "confirmed | pending_approval",
    },
  };
}

function genericPreview(action: CapabilityAction): DevSchemaPreview {
  const base = action.name.split(".").pop() ?? action.name;
  return {
    input: {
      [`${base}Request`]: action.inputSchema,
    },
    output: {
      [`${base}Response`]: action.outputSchema,
    },
  };
}

export function buildDevSchemaPreview(action: CapabilityAction): DevSchemaPreview {
  if (action.name.includes("hotel.search") || action.name.endsWith(".search")) {
    return hotelSearchPreview();
  }
  if (action.name.includes("payment.commit")) {
    return paymentCommitPreview();
  }
  if (action.name.includes("booking.confirm") || action.name.includes(".confirm")) {
    return bookingConfirmPreview();
  }
  if (action.name.includes("hotel") || action.name.includes("booking")) {
    return {
      input: {
        destination: "string",
        checkIn: "date",
        checkOut: "date",
        guests: "number",
      },
      output: {
        result: action.outputSchema,
      },
    };
  }
  return genericPreview(action);
}

export function formatSchemaPreviewJson(preview: Record<string, unknown>): string {
  return JSON.stringify(preview, null, 2);
}
