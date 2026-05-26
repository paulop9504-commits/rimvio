import { NextResponse, type NextRequest } from "next/server";
import { resolveCategory } from "@/lib/categories/resolve-category";
import { isLinkCategory } from "@/lib/categories/types";
import { insertEnrichedLink } from "@/lib/enrichers/persist";
import { enrichUrl } from "@/lib/enrichers/registry";
import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";
import { tryCreateClient } from "@/lib/supabase/server";
import type { LinkRow } from "@/types/database";

export type ScrapeFallback = EnrichedLink["fallback"];

export type ScrapeResult = EnrichedLink & {
  link?: LinkRow;
  linkCategory?: string;
};

type ScrapeRequestBody = {
  url?: string;
  persist?: boolean;
  category?: string;
  expiresAt?: string;
  context?: Partial<EnricherContext>;
};

function getUrlFromRequest(request: NextRequest) {
  return request.nextUrl.searchParams.get("url");
}

async function getBody(request: NextRequest): Promise<ScrapeRequestBody> {
  try {
    return (await request.json()) as ScrapeRequestBody;
  } catch {
    return {};
  }
}

async function handleScrape(
  rawUrl: string,
  options?: {
    persist?: boolean;
    category?: string;
    expiresAt?: string;
    context?: Partial<EnricherContext>;
  }
) {
  const enriched = await enrichUrl(rawUrl, options?.context);
  const linkCategory = resolveCategory(enriched);

  if (!options?.persist) {
    return { ...enriched, linkCategory };
  }

  const supabase = await tryCreateClient();
  if (!supabase) {
    return { ...enriched, linkCategory };
  }

  const link = await insertEnrichedLink(supabase, enriched, {
    category:
      options?.category && isLinkCategory(options.category)
        ? options.category
        : resolveCategory(enriched),
    expiresAt: options?.expiresAt ?? null,
  });

  return { ...enriched, linkCategory, link };
}

export async function GET(request: NextRequest) {
  const rawUrl = getUrlFromRequest(request);

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url query parameter." },
      { status: 400 }
    );
  }

  try {
    const result = await handleScrape(rawUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const body = await getBody(request);
  const rawUrl = body.url ?? null;

  if (!rawUrl) {
    return NextResponse.json(
      { error: "Missing url in request body." },
      { status: 400 }
    );
  }

  try {
    const result = await handleScrape(rawUrl, {
      persist: body.persist,
      category: body.category,
      expiresAt: body.expiresAt,
      context: body.context,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid URL.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
