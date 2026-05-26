import type { LinkActionItem } from "@/types/database";

export type LocationCategory = "commute" | "home" | "office" | "unknown";

export type EnricherContext = {
  hour: number;
  installedApps: string[];
  locationCategory: LocationCategory;
};

export type EnricherFallback = {
  gradient: string;
  initial: string;
  titleFromDomain: boolean;
  imageFromFallback: boolean;
};

export type EnrichedLink = {
  url: string;
  domain: string;
  title: string;
  image: string | null;
  description: string | null;
  actions: LinkActionItem[];
  enricher_id: string;
  source_type: "generic" | "youtube" | "github" | "map" | "commerce" | "kakao" | "transport";
  fallback: EnricherFallback;
};

export type PageMetadata = {
  url: string;
  domain: string;
  title: string | null;
  image: string | null;
  description: string | null;
};

export type Enricher = {
  id: string;
  domains?: string[];
  enrich: (url: string, context: EnricherContext) => Promise<EnrichedLink>;
};
