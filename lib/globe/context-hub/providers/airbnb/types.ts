export type AirbnbIntegrationMode = "disabled" | "handoff" | "partner_api";

export type AirbnbLodgingSearchInput = {
  query: string;
  checkInYmd?: string | null;
  checkOutYmd?: string | null;
  adults?: number | null;
  lat?: number | null;
  lng?: number | null;
};

export type AirbnbPartnerListingStub = {
  listingId: string;
  title: string;
  nightlyPriceKrw: number | null;
  deepLinkUrl: string;
};
