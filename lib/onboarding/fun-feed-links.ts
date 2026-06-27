import type { LinkRow } from "@/types/database";
import funFeedLinksJson from "@/lib/onboarding/fun-feed-links.json";

/** Dev fallback feed rows when Supabase is unavailable. */
export const funFeedLinks = funFeedLinksJson as unknown as LinkRow[];
