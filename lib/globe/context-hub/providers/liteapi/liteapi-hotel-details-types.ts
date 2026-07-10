export type LiteApiHotelImage = {
  url?: string;
  thumbnailUrl?: string;
  caption?: string;
  order?: number;
  defaultImage?: boolean;
};

export type LiteApiRoomPhoto = {
  url?: string;
  hd_url?: string;
  failoverPhoto?: string;
  mainPhoto?: boolean;
  score?: number;
};

export type LiteApiHotelRoom = {
  id?: number | string;
  roomName?: string;
  photos?: LiteApiRoomPhoto[];
};

export type LiteApiHotelDetailsData = {
  id?: string;
  name?: string;
  hotelImages?: LiteApiHotelImage[];
  main_photo?: string;
  thumbnail?: string;
  rooms?: LiteApiHotelRoom[];
};

export type LiteApiHotelDetailsResponse = {
  data?: LiteApiHotelDetailsData;
};

export type LiteApiCaptionPhotoEntry = {
  caption: string;
  url: string;
};

export type LiteApiRoomPhotoCatalogEntry = {
  mappedRoomId: string | null;
  roomName: string;
  imageUrls: readonly string[];
};

export type LiteApiHotelDetailsBundle = {
  hotelImages: readonly string[];
  roomPhotosByMappedId: ReadonlyMap<string, readonly string[]>;
  /** rooms[] catalog for fuzzy name match when mappedRoomId is missing. */
  roomCatalog: readonly LiteApiRoomPhotoCatalogEntry[];
  /** hotelImages captions for secondary fuzzy match. */
  captionPhotoIndex: readonly LiteApiCaptionPhotoEntry[];
};
