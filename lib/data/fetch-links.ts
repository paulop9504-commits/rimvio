import { getAuthUserId } from "@/lib/auth/session";
import { filterActiveLinks } from "@/lib/utils/link-archive";
import { funFeedLinks } from "@/lib/demo/fun-feed-links";
import type { LinkRow } from "@/types/database";
import { tryCreateClient } from "@/lib/supabase/server";

export async function fetchLinks(): Promise<LinkRow[]> {
  const supabase = await tryCreateClient();
  if (!supabase) {
    return process.env.NODE_ENV === "development" ? funFeedLinks : [];
  }

  const userId = await getAuthUserId();

  let query = supabase.from("links").select("*");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLinks]", error.message);
    return process.env.NODE_ENV === "development" ? funFeedLinks : [];
  }

  if (!data?.length) {
    if (process.env.NODE_ENV === "development") {
      return funFeedLinks;
    }

    return [];
  }

  return data;
}

export async function fetchActiveLinks(): Promise<LinkRow[]> {
  const links = await fetchLinks();
  return filterActiveLinks(links);
}
