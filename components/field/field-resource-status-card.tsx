"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCopy } from "@/hooks/use-copy";
import { useRegionalProfile } from "@/hooks/use-regional-profile";
import { useActiveMarketTrades } from "@/hooks/use-active-market-trades";
import type { MarketIntentRecord } from "@/lib/globe/market/market-intent-types";
import { AgentProgressList } from "@/components/ui/agent-progress-list";
import { openMarketChatForListing } from "@/lib/globe/market/open-market-alignment-offer";
import {
  buildMatchAgentTasks,
  matchAgentTasksComplete,
} from "@/lib/resource/build-match-agent-tasks";
import { resolveResourceStatus } from "@/lib/resource/resolve-resource-status";
import type { ResourceMatchedPerson } from "@/lib/resource/resource-status-types";
import { cn } from "@/lib/utils";

export type FieldResourceStatusCardProps = {
  record: MarketIntentRecord;
  className?: string;
  onBeforeChatNavigate?: () => void;
};

/** Field mine tab — AI activity monitor for one owned resource. */
export function FieldResourceStatusCard({
  record,
  className,
  onBeforeChatNavigate,
}: FieldResourceStatusCardProps) {
  const copy = useCopy();
  const field = copy.globe.field;
  const router = useRouter();
  const { profile } = useRegionalProfile();
  const { sessions } = useActiveMarketTrades({ enabled: true });
  const [chatBusy, setChatBusy] = useState(false);

  const status = useMemo(
    () =>
      resolveResourceStatus({
        record,
        tradeSessions: sessions,
        priceProfile: profile,
      }),
    [profile, record, sessions],
  );

  const topMatch: ResourceMatchedPerson | null =
    status.aiActivity.matchedCandidates[0] ?? null;

  const matchTasks = useMemo(() => buildMatchAgentTasks(status), [status]);
  const showMatchProgress =
    status.visibility.outerGlobe && !matchAgentTasksComplete(matchTasks);

  const openMatchChat = async (match: ResourceMatchedPerson) => {
    if (chatBusy) {
      return;
    }
    setChatBusy(true);
    try {
      await openMarketChatForListing({
        focusEventId: record.eventId,
        matchIntentId: match.matchIntentId,
        initTradeSession: true,
        fromFieldDiscovery: false,
        copy: { bridgeFail: copy.globe.field.actionUnavailable },
        navigate: (href) => router.push(href),
        onBeforeNavigate: onBeforeChatNavigate,
      });
    } catch {
      toast.error(copy.globe.field.actionUnavailable);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl bg-[#f8f9fb] px-3 py-3 ring-1 ring-[#eef1f4]",
        className,
      )}
      data-field-resource-status-card
      data-resource-event-id={record.eventId}
    >
      <p className="text-[11px] font-semibold text-[#3182f6]">{field.resourceStatusEyebrow}</p>

      {showMatchProgress ? (
        <AgentProgressList
          className="mt-2"
          variant="light"
          layout="vertical"
          titleKo={copy.globe.agentProgress.matchSearchTitle}
          tasks={matchTasks}
        />
      ) : null}

      <div className="mt-2 space-y-1 text-[12px] text-[#4e5968]">
        <p>{field.resourceStatusViews(status.aiActivity.views)}</p>
        <p>{field.resourceStatusInquiries(status.aiActivity.inquiries.length)}</p>
        {status.aiActivity.matchedCandidates.length > 0 ? (
          <>
            <p>{field.resourceStatusMatches(status.aiActivity.matchedCandidates.length)}</p>
            <ul className="space-y-0.5 pl-1 text-[11px] text-[#6b7684]">
              {status.aiActivity.matchedCandidates.map((match) => (
                <li key={match.matchIntentId}>
                  {field.resourceStatusMatchLine(
                    match.displayNameKo,
                    `${match.distanceKm}km, ${match.interestHintKo}`,
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[11px] text-[#8b95a1]">{field.resourceStatusNoMatches}</p>
        )}
      </div>

      {topMatch ? (
        <button
          type="button"
          disabled={chatBusy}
          onClick={() => void openMatchChat(topMatch)}
          className="mt-3 w-full rounded-xl bg-[#3182f6] px-3 py-2.5 text-[12px] font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {field.resourceStatusChatCta}
        </button>
      ) : null}
    </section>
  );
}
