import { validateProductSearchOutput } from "./capability/contracts";

export type SandboxVerification = {
  ok: boolean;
  errors: string[];
};

export function verifySandboxOutput(
  capability: string,
  output: unknown,
): SandboxVerification {
  if (capability === "hotel.search") {
    return verifyHotelSearchOutput(output);
  }
  if (capability === "hotel.detail") {
    return verifyHotelDetailOutput(output);
  }
  if (capability === "product.search") {
    const result = validateProductSearchOutput(output);
    return result.ok ? { ok: true, errors: [] } : { ok: false, errors: result.errors };
  }
  return { ok: true, errors: [] };
}

function verifyHotelSearchOutput(output: unknown): SandboxVerification {
  const errors: string[] = [];
  if (!output || typeof output !== "object") {
    return { ok: false, errors: ["output must be an object"] };
  }
  const record = output as Record<string, unknown>;
  if (typeof record.hotelsFound !== "number" || record.hotelsFound < 0) {
    errors.push("hotelsFound must be a non-negative number");
  }
  if (typeof record.location !== "string" || !record.location.trim()) {
    errors.push("location must be a non-empty string");
  }
  return { ok: errors.length === 0, errors };
}

function verifyHotelDetailOutput(output: unknown): SandboxVerification {
  const errors: string[] = [];
  if (!output || typeof output !== "object") {
    return { ok: false, errors: ["output must be an object"] };
  }
  const record = output as Record<string, unknown>;
  if (typeof record.hotelId !== "string" || !record.hotelId.trim()) {
    errors.push("hotelId must be a non-empty string");
  }
  if (typeof record.name !== "string" || !record.name.trim()) {
    errors.push("name must be a non-empty string");
  }
  return { ok: errors.length === 0, errors };
}
