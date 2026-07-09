import { liteApiRatesUrl } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";

import { liteApiFetch } from "@/lib/globe/context-hub/providers/liteapi/liteapi-http";

import type {

  LiteApiHotelDetailsBundle,

  LiteApiHotelDetailsResponse,

} from "@/lib/globe/context-hub/providers/liteapi/liteapi-hotel-details-types";

import { buildLiteApiHotelDetailsBundle } from "@/lib/globe/context-hub/providers/liteapi/extract-liteapi-room-photos";



const DETAIL_FETCH_CONCURRENCY = 4;



export {

  extractLiteApiHotelImageUrls,

  extractLiteApiRoomPhotoUrls,

} from "@/lib/globe/context-hub/providers/liteapi/extract-liteapi-room-photos";



async function fetchLiteApiHotelDetails(

  hotelId: string,

): Promise<LiteApiHotelDetailsResponse["data"] | null> {

  const params = new URLSearchParams({ hotelId: hotelId.trim() });

  const response = await liteApiFetch<LiteApiHotelDetailsResponse>({

    url: `${liteApiRatesUrl("/data/hotel")}?${params.toString()}`,

    method: "GET",

  });

  if (!response.ok) {

    return null;

  }

  return response.data.data ?? null;

}



/** Batch hotel details — gallery + mapped room photos (concurrency capped). */

export async function fetchLiteApiHotelDetailsBundles(

  hotelIds: readonly string[],

  fallbackById?: Readonly<Record<string, string | null | undefined>>,

): Promise<Map<string, LiteApiHotelDetailsBundle>> {

  const unique = [...new Set(hotelIds.map((id) => id.trim()).filter(Boolean))];

  const result = new Map<string, LiteApiHotelDetailsBundle>();



  for (let index = 0; index < unique.length; index += DETAIL_FETCH_CONCURRENCY) {

    const chunk = unique.slice(index, index + DETAIL_FETCH_CONCURRENCY);

    const rows = await Promise.all(

      chunk.map(async (hotelId) => {

        const details = await fetchLiteApiHotelDetails(hotelId);

        const bundle = buildLiteApiHotelDetailsBundle({

          details,

          fallback: fallbackById?.[hotelId] ?? null,

        });

        return { hotelId, bundle } as const;

      }),

    );

    for (const row of rows) {

      if (
        row.bundle.hotelImages.length > 0 ||
        row.bundle.roomPhotosByMappedId.size > 0 ||
        row.bundle.roomCatalog.length > 0
      ) {

        result.set(row.hotelId, row.bundle);

      }

    }

  }



  return result;

}



/** Batch hotel gallery — GET /data/hotel per id (concurrency capped). */

export async function fetchLiteApiHotelImageMap(

  hotelIds: readonly string[],

  fallbackById?: Readonly<Record<string, string | null | undefined>>,

): Promise<Map<string, string[]>> {

  const bundles = await fetchLiteApiHotelDetailsBundles(hotelIds, fallbackById);

  const result = new Map<string, string[]>();

  for (const [hotelId, bundle] of bundles) {

    if (bundle.hotelImages.length > 0) {

      result.set(hotelId, [...bundle.hotelImages]);

    }

  }

  return result;

}


