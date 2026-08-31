/**
 * Merchant Activity Detail — same metadata, structured tree for UI.
 */

import type { OrderMetadata, OrderRecord } from "@/lib/experience-app/types";

export type OrderMetadataTree = {
  readonly consumer: string;
  readonly restaurant: string;
  readonly actions: readonly { readonly label: string; readonly at: string }[];
  readonly capabilities: readonly string[];
  readonly infrastructure: readonly string[];
  readonly llmModel: string;
  readonly mapsProvider: string;
};

export function projectOrderMetadataTree(
  order: OrderRecord,
  rows: readonly OrderMetadata[],
): OrderMetadataTree {
  const capabilities = [...new Set(rows.map((r) => r.capabilityId))];
  const infrastructure = [...new Set(rows.flatMap((r) => r.infrastructure))];
  const llmModel = rows.find((r) => r.llmModel)?.llmModel ?? "gpt-4o-mini";
  const mapsProvider = rows.find((r) => r.mapsProvider)?.mapsProvider ?? "nearby-search";
  return {
    consumer: order.consumerId,
    restaurant: order.storeId,
    actions: rows.map((r) => ({ label: r.action, at: r.at })),
    capabilities,
    infrastructure,
    llmModel,
    mapsProvider,
  };
}
