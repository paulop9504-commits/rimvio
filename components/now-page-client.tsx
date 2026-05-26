"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { NowActionFocus } from "@/components/now-action-focus";
import { NowLoadingShimmer } from "@/components/now-loading-shimmer";
import type { EnrichedLink, EnricherContext } from "@/lib/enrichers/types";
import { persistEnrichedLink, persistEnrichedLinkOptimistic } from "@/lib/share/persist-enriched-link";
import { enrichSharedUrl } from "@/lib/share/scrape-shared-link";
import { inferEnricherContext } from "@/lib/share/infer-context";
import { parseSharePayload } from "@/lib/share/parse-share-payload";
import {
  readNowContext,
  setNowContext,
} from "@/lib/local-links/now-session";
import { readAnalyticsFlowId, startAnalyticsFlow, trackEnrich, trackFunnel } from "@/lib/analytics/track-client";

function NowBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);

  const [enriched, setEnriched] = useState<EnrichedLink | null>(null);
  const [context, setContext] = useState<EnricherContext | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    const parsed = parseSharePayload({
      title: searchParams.get("title") ?? undefined,
      text: searchParams.get("text") ?? undefined,
      url: searchParams.get("url") ?? undefined,
    });

    if (!parsed.url) {
      setPhase("error");
      trackFunnel("now_error");
      toast.error("공유된 링크를 찾지 못했어요.");
      router.replace("/");
      return;
    }

    trackFunnel("now_open");

    if (typeof window !== "undefined" && !readAnalyticsFlowId()) {
      startAnalyticsFlow();
    }

    const load = async () => {
      try {
        const enricherContext =
          readNowContext() ?? inferEnricherContext();
        setContext(enricherContext);
        setNowContext(enricherContext);

        const result = await enrichSharedUrl(parsed.url!, enricherContext);
        trackEnrich(result);
        trackFunnel("now_ready", {
          domain: result.domain,
          enricher_id: result.enricher_id,
        });
        setEnriched(result);
        setPhase("ready");
      } catch (error) {
        setPhase("error");
        trackFunnel("now_error");
        toast.error("다음 행동을 찾지 못했어요.", {
          description:
            error instanceof Error ? error.message : "다시 시도해 주세요.",
        });
        router.replace("/");
      }
    };

    void load();
  }, [router, searchParams]);

  const handleStack = () => {
    if (!enriched) {
      router.replace("/");
      return;
    }

    const ctx = context ?? inferEnricherContext();
    persistEnrichedLinkOptimistic(enriched);
    void persistEnrichedLink(enriched, ctx);
    router.replace("/");
    router.refresh();
  };

  if (phase === "loading") {
    return <NowLoadingShimmer />;
  }

  if (!enriched) {
    return null;
  }

  return <NowActionFocus enriched={enriched} context={context ?? inferEnricherContext()} onStack={handleStack} />;
}

export function NowPageClient() {
  return (
    <Suspense fallback={<NowLoadingShimmer />}>
      <NowBridge />
    </Suspense>
  );
}
