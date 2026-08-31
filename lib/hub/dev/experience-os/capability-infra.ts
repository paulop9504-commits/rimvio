/**
 * Capability → infrastructure dependencies. UI and Agent apply the same ops.
 */

import type { ExperienceResourceOp } from "@/lib/hub/dev/experience-os/types";

export type CapabilityInfraStep = {
  readonly op: ExperienceResourceOp;
  readonly args: Record<string, unknown>;
};

export function infrastructureForCapability(capabilityId: string): readonly CapabilityInfraStep[] {
  const c = capabilityId.toLowerCase();
  const steps: CapabilityInfraStep[] = [];

  if (/auth|signup|login|role/.test(c)) {
    steps.push({ op: "auth.createRole", args: { name: /seller|판매/.test(c) ? "seller" : "member" } });
  }
  if (/book/.test(c)) {
    steps.push({ op: "database.createTable", args: { name: "bookings" } });
  }
  if (/hotel|listing|product|menu/.test(c)) {
    steps.push({
      op: "database.createTable",
      args: { name: /hotel/.test(c) ? "hotels" : /menu/.test(c) ? "menus" : "products" },
    });
  }
  if (/search/.test(c)) {
    steps.push({ op: "function.create", args: { name: capabilityId, description: "Search" } });
  }
  if (/payment|pay|order/.test(c)) {
    steps.push({ op: "secret.set", args: { name: "STRIPE_SECRET_KEY" } });
    steps.push({ op: "database.createTable", args: { name: "orders" } });
  }
  if (/image|upload|avatar|storage/.test(c) || /product|menu/.test(c)) {
    steps.push({
      op: "storage.createBucket",
      args: { name: /avatar/.test(c) ? "avatars" : "product-images" },
    });
  }
  if (!steps.some((s) => s.op === "function.create")) {
    steps.push({ op: "function.create", args: { name: capabilityId } });
  }
  return steps;
}
