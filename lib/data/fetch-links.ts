import { linkRowToActionCard } from "@/lib/mappers/link-row";
import type { LinkAction } from "@/lib/types/link-action";
import { filterActiveLinks } from "@/lib/utils/link-archive";
import { mockLinks, type LinkRow } from "@/types/database";
import { tryCreateClient } from "@/lib/supabase/server";

export async function fetchLinks(): Promise<LinkRow[]> {
  const supabase = await tryCreateClient();
  if (!supabase) {
    return mockLinks;
  }

  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchLinks]", error.message);
    return mockLinks;
  }

  if (!data?.length) {
    return mockLinks;
  }

  return data;
}

export async function fetchActiveLinks(): Promise<LinkRow[]> {
  const links = await fetchLinks();
  return filterActiveLinks(links);
}
