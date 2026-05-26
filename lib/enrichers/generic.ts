import {
  extractUrlsFromText,
  hostnameFromUrl,
} from "@/lib/enrichers/extract-urls";
import {
  attachCopyText,
  createCopyOnlyAction,
  createOpenAction,
} from "@/lib/enrichers/action-factory";
import { buildDomainQuickActions } from "@/lib/enrichers/domain-actions";
import {
  fetchPageMetadata,
  withDomainFallback,
} from "@/lib/enrichers/fetch-page-metadata";
import { parseTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import type {
  EnrichedLink,
  Enricher,
  EnricherContext,
} from "@/lib/enrichers/types";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

function buildActionsFromDescription(
  originalUrl: string,
  description: string | null,
  copyText: string | null
): LinkActionItem[] {
  const extracted = extractUrlsFromText(description).filter(
    (href) => href !== originalUrl
  );

  if (extracted.length === 0) {
    return [
      createOpenAction({
        label: "원본 열기",
        href: originalUrl,
        icon: "external-link",
        copyText,
      }),
    ];
  }

  return extracted.slice(0, MAX_ACTIONS).map((href, index) => {
    const host = hostnameFromUrl(href);

    return createOpenAction({
      label:
        extracted.length === 1
          ? "참고 링크 열기"
          : `참고 링크 ${index + 1} · ${host}`,
      href,
      icon: "link",
      copyText: href,
    });
  });
}

function buildGenericActions(
  url: string,
  domain: string,
  title: string | null,
  description: string | null
) {
  const copyText = title?.trim() || null;
  const domainActions = buildDomainQuickActions(url, domain, title);
  const descActions = buildActionsFromDescription(url, description, copyText);

  let actions: LinkActionItem[] = [];

  if (domainActions.length > 0) {
    actions = [...domainActions, ...descActions];
  } else if (copyText) {
    actions = [
      createOpenAction({
        label: "🔗 열기",
        href: url,
        icon: "external-link",
        copyText,
      }),
      createCopyOnlyAction(`📋 ${copyText.slice(0, 18)} 복사`, copyText),
      ...descActions.filter((action) => action.href !== url),
    ];
  } else {
    actions = descActions;
  }

  const seen = new Set<string>();
  const deduped: LinkActionItem[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href ?? ""}|${action.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(copyText ? attachCopyText(action, copyText) : action);
  }

  return deduped.slice(0, MAX_ACTIONS);
}

export const genericEnricher: Enricher = {
  id: "generic-v1",

  async enrich(
    rawUrl: string,
    _context: EnricherContext
  ): Promise<EnrichedLink> {
    const metadata = await fetchPageMetadata(rawUrl);
    const urlTitle = parseTitleFromUrl(rawUrl);
    const normalized = withDomainFallback(metadata, {
      title: metadata.title ?? urlTitle,
      image: metadata.image,
      description: metadata.description,
    });

    const title =
      normalized.fallback.titleFromDomain && urlTitle
        ? urlTitle
        : normalized.title;
    const hasRealTitle = Boolean(metadata.title?.trim() || urlTitle?.trim());

    const actions = buildGenericActions(
      normalized.url,
      normalized.domain,
      title,
      normalized.description
    );

    return {
      url: normalized.url,
      domain: normalized.domain,
      title,
      image: normalized.image,
      description: normalized.description,
      actions,
      enricher_id: "generic-v1",
      source_type: "generic",
      fallback: {
        ...normalized.fallback,
        titleFromDomain: !hasRealTitle,
      },
    };
  },
};
