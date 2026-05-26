import { hasInstalledApp, isCommuteHour } from "@/lib/enrichers/context";
import type { EnricherContext } from "@/lib/enrichers/types";
import { parseMapTitleFromUrl } from "@/lib/enrichers/url-intelligence";
import {
  buildGoogleMapsNavigateHref,
  buildKakaoMapAction,
  buildKakaoMapSearchAction,
  buildYouTubeAppHref,
  isPlaceRelatedUrl,
} from "@/lib/resolvers/deep-links";
import type { LinkActionItem } from "@/types/database";

const MAX_ACTIONS = 5;

const MAP_NAVI_PATTERN =
  /map|navi|transit|subway|metro|direction|kakaomap|map\.kakao|map\.naver|google\.com\/maps/i;

export function isMapOrNaviAction(action: LinkActionItem) {
  const target = `${action.href ?? ""} ${action.label}`;
  return MAP_NAVI_PATTERN.test(target);
}

function readCopyTextFromActions(actions: LinkActionItem[]): string | null {
  for (const action of actions) {
    const value = action.payload?.copyText;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function dedupeActions(actions: LinkActionItem[]) {
  const seen = new Set<string>();
  const next: LinkActionItem[] = [];

  for (const action of actions) {
    const key = `${action.label}|${action.href ?? ""}|${action.kind}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    next.push(action);
  }

  return next;
}

function maybePrependNavigateAction(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  copyText: string | null
) {
  if (!isCommuteHour(context.hour) && context.locationCategory !== "commute") {
    return actions;
  }

  if (!isPlaceRelatedUrl(sourceUrl)) {
    return actions;
  }

  const navigateHref = buildGoogleMapsNavigateHref(sourceUrl);
  const hasNavigate = actions.some(
    (action) => action.href === navigateHref || action.label.includes("길찾기")
  );

  if (hasNavigate) {
    return actions;
  }

  const navigateAction: LinkActionItem = {
    id: crypto.randomUUID(),
    kind: "open",
    label: "🚗 길찾기",
    href: navigateHref,
    payload: {
      icon: "map",
      contextBoost: "commute",
      ...(copyText ? { copyText } : {}),
    },
  };

  return [navigateAction, ...actions];
}

function maybePrependYouTubeAppAction(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string,
  copyText: string | null
) {
  if (!hasInstalledApp(context, "youtube")) {
    return actions;
  }

  const appHref = buildYouTubeAppHref(sourceUrl);
  if (!appHref) {
    return actions;
  }

  const hasAppAction = actions.some((action) => action.href === appHref);
  if (hasAppAction) {
    return actions;
  }

  const appAction: LinkActionItem = {
    id: crypto.randomUUID(),
    kind: "open",
    label: "📱 YouTube 앱으로",
    href: appHref,
    payload: {
      icon: "youtube",
      contextBoost: "installed-app",
      ...(copyText ? { copyText } : {}),
    },
  };

  return [
    appAction,
    ...actions.filter((action) => action.href !== appHref),
  ];
}

/**
 * Final action pass: installedApps deep links + commute navigation boost.
 */
export function resolveActions(
  actions: LinkActionItem[],
  context: EnricherContext,
  sourceUrl: string
): LinkActionItem[] {
  let next = [...actions];
  const copyText =
    readCopyTextFromActions(next) ?? parseMapTitleFromUrl(sourceUrl);

  if (hasInstalledApp(context, "kakaomap") && isPlaceRelatedUrl(sourceUrl)) {
    const kakaoAction = buildKakaoMapAction(sourceUrl, copyText);
    next = [
      kakaoAction,
      ...next.filter(
        (action) =>
          action.href !== kakaoAction.href &&
          action.payload?.icon !== "kakaomap"
      ),
    ];

    if (copyText) {
      const searchAction = buildKakaoMapSearchAction(copyText);
      const hasSearch = next.some(
        (action) => action.href === searchAction.href
      );
      if (!hasSearch) {
        next = [
          kakaoAction,
          searchAction,
          ...next.filter(
            (action) =>
              action.href !== kakaoAction.href &&
              action.href !== searchAction.href
          ),
        ];
      }
    }
  }

  next = maybePrependNavigateAction(next, context, sourceUrl, copyText);
  next = maybePrependYouTubeAppAction(next, context, sourceUrl, copyText);

  if (next.length === 0) {
    next = [
      {
        id: crypto.randomUUID(),
        kind: "open",
        label: "원본 열기",
        href: sourceUrl,
        payload: {
          icon: "external-link",
          ...(copyText ? { copyText } : {}),
        },
      },
    ];
  }

  return dedupeActions(next).slice(0, MAX_ACTIONS);
}

export { isPlaceRelatedUrl, buildKakaoMapAction } from "@/lib/resolvers/deep-links";
