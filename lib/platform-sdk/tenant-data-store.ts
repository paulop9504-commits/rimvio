/**
 * Tenant-scoped in-memory Data API (host mount MVP).
 */

import type {
  DataCreateRequest,
  DataSearchRequest,
} from "@/lib/platform-sdk/types";
import type { PlatformDataDocument } from "@/lib/platform-sdk/host-apis";

type TenantStore = Map<string, PlatformDataDocument[]>;

const tenants = new Map<string, TenantStore>();

function tenantKey(platformId: string): string {
  return platformId.trim();
}

function collectionKey(collection: string): string {
  return collection.trim();
}

function getCollection(platformId: string, collection: string): PlatformDataDocument[] {
  const tKey = tenantKey(platformId);
  let store = tenants.get(tKey);
  if (!store) {
    store = new Map();
    tenants.set(tKey, store);
  }
  const cKey = collectionKey(collection);
  let rows = store.get(cKey);
  if (!rows) {
    rows = [];
    store.set(cKey, rows);
  }
  return rows;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createTenantDataApi() {
  return {
    async create(input: DataCreateRequest): Promise<PlatformDataDocument> {
      const now = new Date().toISOString();
      const doc: PlatformDataDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        collection: input.collection,
        platformId: input.platformId,
        ownerUserId: input.ownerUserId,
        document: { ...input.document },
        createdAtIso: now,
        updatedAtIso: now,
      };
      const rows = getCollection(input.platformId, input.collection);
      rows.push(doc);
      return doc;
    },

    async search(input: DataSearchRequest): Promise<readonly PlatformDataDocument[]> {
      let rows = [...getCollection(input.platformId, input.collection)];

      if (input.where) {
        rows = rows.filter((row) =>
          Object.entries(input.where ?? {}).every(([key, value]) => row.document[key] === value),
        );
      }

      if (input.near && input.radiusKm) {
        rows = rows.filter((row) => {
          const lat = row.document.lat as number | undefined;
          const lng = row.document.lng as number | undefined;
          if (typeof lat !== "number" || typeof lng !== "number") return false;
          return haversineKm(input.near!.lat, input.near!.lng, lat, lng) <= input.radiusKm!;
        });
      }

      const limit = input.limit ?? 50;
      return rows.slice(0, limit);
    },
  };
}

export function clearTenantDataForTests(): void {
  tenants.clear();
}

export function readTenantCollectionSize(platformId: string, collection: string): number {
  return getCollection(platformId, collection).length;
}
