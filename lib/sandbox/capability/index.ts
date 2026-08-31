import { HotelDetailCapabilityRunner } from "./hotel-detail-runner";
import { HotelSearchCapabilityRunner } from "./hotel-search-runner";
import { ProductSearchCapabilityRunner } from "./product-search-runner";
import type { CapabilityRuntime } from "../types";

export function resolveCapabilityRunner(capability: string): CapabilityRuntime | null {
  if (capability === "hotel.search") {
    return new HotelSearchCapabilityRunner();
  }
  if (capability === "hotel.detail") {
    return new HotelDetailCapabilityRunner();
  }
  if (capability === "product.search") {
    return new ProductSearchCapabilityRunner();
  }
  return null;
}

export function requiresRealBrowser(capability: string): boolean {
  return capability === "product.search";
}
