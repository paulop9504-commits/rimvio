"use client";

/**
 * MobileWorkspace — Spatial AI Operating Workspace (mobile Interaction Model).
 *
 * Map Canvas (primary) + Command Bar + Expandable Object Sheet.
 * Desktop multi Floating Windows are forbidden here.
 */

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  applyWorkspaceTransition,
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { tryApplyWorkspacePromptTurn } from "@/lib/context-workspace/try-apply-workspace-lodging-turn";
import { appendWorkspaceChatTurn } from "@/lib/context-workspace/workspace-chat-store";
import { resolveRimvioCommandPlaceholder } from "@/lib/rimvio-command";
import {
  buildNearbyRelationsFromAnchor,
  dispatchMobileWorkspace,
  mobileEntitiesFromWorkspaceNodes,
  parseMobileWorkspaceCommand,
} from "@/lib/mobile-workspace";
import { useMobileWorkspace } from "@/lib/mobile-workspace/use-mobile-workspace";
import { ActionMenu } from "@/components/mobile-workspace/ActionMenu";
import { BottomSheetWorkspace } from "@/components/mobile-workspace/BottomSheetWorkspace";
import { CommandBar } from "@/components/mobile-workspace/CommandBar";
import { ContextAnchor } from "@/components/mobile-workspace/ContextAnchor";
import { RealityMap } from "@/components/mobile-workspace/RealityMap";
import {
  RelationshipHighlight,
  relatedEntityIds,
} from "@/components/mobile-workspace/RelationshipHighlight";
import { cn } from "@/lib/utils";
import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";

export type MobileWorkspaceProps = {
  readonly contextEventId: string;
  readonly projectTitleKo?: string | null;
  readonly pins: readonly WorkspaceMapPin[];
  readonly preferredCenter?: { readonly lat: number; readonly lng: number } | null;
  readonly routeLineCoords?: readonly [number, number][];
  readonly onSelectPin?: (id: string) => void;
  readonly onPrepareReserve?: (id: string) => void;
  readonly className?: string;
};

function hydrateFromWorkspace(
  eventId: string,
  ws: ContextWorkspaceState,
  titleKo: string,
): void {
  const entities = mobileEntitiesFromWorkspaceNodes(ws.nodes);
  const selected =
    ws.nodes.find((n) => n.selected && n.kind === "lodging") ??
    ws.nodes.find((n) => n.kind === "lodging") ??
    null;
  const anchorId = selected?.id ?? null;
  const relations = anchorId
    ? buildNearbyRelationsFromAnchor({
        anchorId,
        entities,
      })
    : [];
  dispatchMobileWorkspace({
    type: "hydrate",
    contextId: eventId,
    contextTitleKo: titleKo,
    entities,
    relations,
    anchorEntityId: anchorId,
  });
}

export function MobileWorkspace({
  contextEventId,
  projectTitleKo = null,
  pins,
  preferredCenter = null,
  routeLineCoords,
  onSelectPin,
  onPrepareReserve,
  className,
}: MobileWorkspaceProps) {
  const mobile = useMobileWorkspace();
  const eventId = contextEventId.trim();

  useEffect(() => {
    const ws = readContextWorkspace(eventId);
    if (!ws) return;
    hydrateFromWorkspace(
      eventId,
      ws,
      projectTitleKo?.trim() || ws.summaryKo || ws.query || "Workspace",
    );
    const unsub = subscribeContextWorkspaceUpdated((id) => {
      if (id !== eventId) return;
      const next = readContextWorkspace(eventId);
      if (!next) return;
      hydrateFromWorkspace(
        eventId,
        next,
        projectTitleKo?.trim() || next.summaryKo || next.query || "Workspace",
      );
    });
    return () => {
      unsub();
      dispatchMobileWorkspace({ type: "clear" });
    };
  }, [eventId, projectTitleKo]);

  const activeEntity = useMemo(() => {
    if (!mobile?.activeEntityId) return null;
    return mobile.entities.find((e) => e.id === mobile.activeEntityId) ?? null;
  }, [mobile]);

  const anchorEntity = useMemo(() => {
    if (!mobile?.anchorEntityId) return null;
    return mobile.entities.find((e) => e.id === mobile.anchorEntityId) ?? null;
  }, [mobile]);

  const related = useMemo(
    () =>
      relatedEntityIds({
        activeEntityId: mobile?.activeEntityId ?? null,
        relations: mobile?.relations ?? [],
      }),
    [mobile],
  );

  const onCommand = useCallback(
    async (text: string) => {
      const parsed = parseMobileWorkspaceCommand(text);
      dispatchMobileWorkspace({
        type: "apply_intent",
        intent: {
          rawText: text,
          action: parsed.action,
          target: parsed.target,
          constraint: parsed.constraint,
        },
      });

      if (parsed.action === "set_anchor" && mobile?.activeEntityId) {
        dispatchMobileWorkspace({
          type: "set_anchor",
          entityId: mobile.activeEntityId,
        });
        toast.success("Context Anchor 설정");
      }

      appendWorkspaceChatTurn({
        contextEventId: eventId,
        role: "user",
        text,
      });

      const result = await tryApplyWorkspacePromptTurn({
        contextEventId: eventId,
        utterance: text,
      });
      if (result.handled && result.replyKo) {
        appendWorkspaceChatTurn({
          contextEventId: eventId,
          role: "assistant",
          text: result.replyKo,
        });
        toast.message(result.replyKo);
      }

      // Refresh projection after NL mutates Workspace
      const ws = readContextWorkspace(eventId);
      if (ws) {
        const entities = mobileEntitiesFromWorkspaceNodes(ws.nodes);
        const anchorId = mobile?.anchorEntityId ?? null;
        dispatchMobileWorkspace({
          type: "apply_intent",
          intent: {
            rawText: text,
            action: parsed.action,
            target: parsed.target,
            constraint: parsed.constraint,
          },
          entities,
          relations: anchorId
            ? buildNearbyRelationsFromAnchor({ anchorId, entities })
            : [],
        });
      }
    },
    [eventId, mobile?.activeEntityId, mobile?.anchorEntityId],
  );

  const handleSelect = useCallback(
    (id: string) => {
      dispatchMobileWorkspace({ type: "set_active", entityId: id });
      dispatchMobileWorkspace({ type: "set_callout_mode", mode: "compact" });
      onSelectPin?.(id);
    },
    [onSelectPin],
  );

  const menuEntity = useMemo(() => {
    if (!mobile?.actionMenuEntityId) return null;
    return (
      mobile.entities.find((e) => e.id === mobile.actionMenuEntityId) ?? null
    );
  }, [mobile]);

  const evidenceKo = useMemo(() => {
    if (!activeEntity || !mobile) return [] as string[];
    const lines: string[] = [];
    if (anchorEntity && activeEntity.id !== anchorEntity.id) {
      const rel = mobile.relations.find(
        (r) =>
          (r.fromId === anchorEntity.id && r.toId === activeEntity.id) ||
          (r.toId === anchorEntity.id && r.fromId === activeEntity.id),
      );
      if (rel?.walkMinutes != null) {
        lines.push(`앵커에서 도보 ${rel.walkMinutes}분`);
      } else {
        lines.push(`${anchorEntity.title} 근처`);
      }
    }
    if (activeEntity.priceLabelKo) lines.push("가격 정보 있음");
    if (activeEntity.score != null && activeEntity.score >= 70) {
      lines.push("추천 점수 적합");
    }
    if (lines.length === 0) lines.push("Context 기반 후보");
    return lines;
  }, [activeEntity, anchorEntity, mobile]);

  return (
    <div
      className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
      data-mobile-workspace
    >
      {/* ~75% Reality Canvas */}
      <div className="relative min-h-0 flex-[0.78]">
        <RealityMap
          pins={pins}
          selectedId={mobile?.activeEntityId ?? null}
          compactEntity={activeEntity}
          showCompactCallout={
            Boolean(activeEntity) && mobile?.calloutMode === "compact"
          }
          preferredCenter={preferredCenter}
          contextEventId={eventId}
          routeLineCoords={routeLineCoords}
          onSelectPin={handleSelect}
          onPinLongPress={(id) =>
            dispatchMobileWorkspace({ type: "open_action_menu", entityId: id })
          }
          onOpenWorkspace={(id) => {
            dispatchMobileWorkspace({ type: "set_active", entityId: id });
            dispatchMobileWorkspace({
              type: "set_callout_mode",
              mode: "expanded",
            });
            onSelectPin?.(id);
          }}
          onExpandCompact={() =>
            dispatchMobileWorkspace({ type: "expand_callout" })
          }
          onCloseCompact={() =>
            dispatchMobileWorkspace({ type: "close_callout" })
          }
        />

        {anchorEntity ? (
          <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[5] flex justify-center px-3">
            <ContextAnchor
              titleKo={anchorEntity.title}
              onClear={() =>
                dispatchMobileWorkspace({ type: "set_anchor", entityId: null })
              }
            />
          </div>
        ) : null}

        <RelationshipHighlight
          activeEntityId={mobile?.activeEntityId ?? null}
          entities={mobile?.entities ?? []}
          relations={mobile?.relations ?? []}
        />

        {/* Invisible related marker emphasis via data — map pins already shown */}
        <span className="sr-only" data-related-ids={[...related].join(",")}>
          related
        </span>
      </div>

      {/* Expanded / Full sheet */}
      {activeEntity &&
      (mobile?.calloutMode === "expanded" ||
        mobile?.calloutMode === "full") ? (
        <BottomSheetWorkspace
          mode={mobile.calloutMode}
          entity={activeEntity}
          relations={mobile.relations}
          evidenceKo={evidenceKo}
          onExpand={() => dispatchMobileWorkspace({ type: "expand_callout" })}
          onCollapse={() =>
            dispatchMobileWorkspace({ type: "collapse_callout" })
          }
          onCompare={() => {
            applyWorkspaceTransition({
              contextEventId: eventId,
              op: "compare",
              nodeIds: [activeEntity.id],
            });
            toast.message("비교에 추가했어요");
          }}
          onPinAnchor={() => {
            dispatchMobileWorkspace({
              type: "set_anchor",
              entityId: activeEntity.id,
            });
            toast.success(`${activeEntity.title} 기준으로 고정`);
          }}
          onAddSchedule={() => {
            toast.message("일정 추가", {
              description: "Draft 일정 · Commit 아님",
            });
          }}
          onPrepare={() => onPrepareReserve?.(activeEntity.id)}
        />
      ) : null}

      {/* Command Layer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[40] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <CommandBar
          placeholder={resolveRimvioCommandPlaceholder("workspace")}
          onSubmit={(t) => void onCommand(t)}
        />
      </div>

      {menuEntity ? (
        <ActionMenu
          titleKo={menuEntity.title}
          onDismiss={() =>
            dispatchMobileWorkspace({ type: "close_action_menu" })
          }
          items={[
            {
              id: "anchor",
              labelKo: "이 기준으로 찾기",
              onSelect: () =>
                dispatchMobileWorkspace({
                  type: "set_anchor",
                  entityId: menuEntity.id,
                }),
            },
            {
              id: "expand",
              labelKo: "자세히 보기",
              onSelect: () => {
                dispatchMobileWorkspace({
                  type: "set_active",
                  entityId: menuEntity.id,
                });
                dispatchMobileWorkspace({
                  type: "set_callout_mode",
                  mode: "expanded",
                });
              },
            },
            {
              id: "prepare",
              labelKo: "예약 준비",
              onSelect: () => onPrepareReserve?.(menuEntity.id),
            },
          ]}
        />
      ) : null}
    </div>
  );
}
