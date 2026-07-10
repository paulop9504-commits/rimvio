export type LiteApiMoney = {
  amount?: number;
  currency?: string;
};

export type LiteApiRateRow = {
  rateId?: string;
  name?: string;
  adultCount?: number;
  childCount?: number;
  maxOccupancy?: number;
  boardName?: string;
  mappedRoomId?: number | string;
  retailRate?: {
    total?: LiteApiMoney[];
  };
  cancellationPolicies?: {
    refundableTag?: string;
  };
};

export type LiteApiRoomType = {
  roomTypeId?: string;
  name?: string;
  offerId?: string;
  rates?: LiteApiRateRow[];
};

export type LiteApiHotelRate = {
  hotelId: string;
  roomTypes?: LiteApiRoomType[];
};

export type LiteApiHotelCard = {
  id: string;
  name?: string;
  main_photo?: string;
  thumbnail?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  stars?: number;
};

export type LiteApiRatesResponse = {
  data?: LiteApiHotelRate[];
  hotels?: LiteApiHotelCard[];
  sandbox?: boolean;
};

export type LiteApiPrebookResponse = {
  data?: {
    prebookId?: string;
    transactionId?: string;
    secretKey?: string;
    price?: { amount?: number; currency?: string };
  };
};
