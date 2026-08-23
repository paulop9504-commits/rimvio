"use client";

/**
 * MobileWorkspace — Spatial AI Operating Workspace (mobile Interaction Model).
 *
 * Map Canvas (primary) + Command Bar + Expandable Object Sheet.
 * Desktop multi Floating Windows are forbidden here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { applyGlobeWorkspaceAgentTurn } from "@/lib/context-run/apply-globe-workspace-agent-turn";
import { prepareWorkspaceImageAgentTurn } from "@/lib/context-run/build-workspace-image-agent-utterance";
import { appendWorkspaceChatTurn } from "@/lib/context-workspace/workspace-chat-store";
import { resolveRimvioCommandPlaceholder } from "@/lib/rimvio-command";
import { copy } from "@/lib/copy/human-ko";
import {
  buildNearbyRelationsFromAnchor,
  dispatchMobileWorkspace,
  mobileEntitiesFromWorkspaceNodes,
  parseMobileWorkspaceCommand,
} from "@/lib/mobile-workspace";
import { useMobileWorkspace } from "@/lib/mobile-workspace/use-mobile-workspace";
import { ActionMenu } from "@/components/mobile-workspace/ActionMenu";
import { AgentChatCard } from "@/components/mobile-workspace/AgentChatCard";
import { ContextAnchor } from "@/components/mobile-workspace/ContextAnchor";
import { ObjectPlacePanel } from "@/components/mobile-workspace/ObjectPlacePanel";
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
  const [busy, setBusy] = useState(false);
  const [agentExpanded, setAgentExpanded] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

      setBusy(true);
      try {
        const result = await applyGlobeWorkspaceAgentTurn({
          contextEventId: eventId,
          explicitContextEventId: eventId,
          utterance: text,
        });
        if (result.handled && result.statusKo) {
          appendWorkspaceChatTurn({
            contextEventId: eventId,
            role: "assistant",
            text: result.statusKo,
          });
          toast.message(result.statusKo);
        }
      } finally {
        setBusy(false);
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

  const onPickImage = useCallback(
    async (file: File | null | undefined) => {
      if (!file || !eventId) return;
      if (!file.type.startsWith("image/")) {
        toast.message(copy.feed.screenshotInvalid);
        return;
      }
      setBusy(true);
      toast.message(copy.feed.captureIntentFound);
      try {
        const prepared = await prepareWorkspaceImageAgentTurn({ file });
        // Chat shows photo intent; Agent executes operable scoutQuery (Cursor-like).
        appendWorkspaceChatTurn({
          contextEventId: eventId,
          role: "user",
          text: prepared.chatLabelKo,
        });
        const result = await applyGlobeWorkspaceAgentTurn({
          contextEventId: eventId,
          explicitContextEventId: eventId,
          utterance: prepared.utterance,
        });
        if (result.handled && result.statusKo) {
          appendWorkspaceChatTurn({
            contextEventId: eventId,
            role: "assistant",
            text: prepared.plan?.statusKo || result.statusKo,
          });
          toast.message(prepared.plan?.statusKo || result.statusKo);
        }
        const ws = readContextWorkspace(eventId);
        if (ws) {
          const entities = mobileEntitiesFromWorkspaceNodes(ws.nodes);
          const anchorId = mobile?.anchorEntityId ?? null;
          dispatchMobileWorkspace({
            type: "apply_intent",
            intent: {
              rawText: prepared.utterance,
              action: "discover",
              target: prepared.plan?.domain ?? "poi",
              constraint: prepared.plan
                ? { work: prepared.plan.work, via: "vision" }
                : { via: "vision" },
            },
            entities,
            relations: anchorId
              ? buildNearbyRelationsFromAnchor({ anchorId, entities })
              : [],
          });
        }
      } catch {
        toast.message(copy.feed.screenshotFailed);
      } finally {
        setBusy(false);
      }
    },
    [eventId, mobile?.anchorEntityId],
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
      {/* ~80% Reality Canvas — agent floats; map stays primary */}
      <div className="relative min-h-0 flex-[0.85]">
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

      {/* Expanded place panel — one Object focus */}
      {activeEntity &&
      (mobile?.calloutMode === "expanded" ||
        mobile?.calloutMode === "full") ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] flex justify-center">
          <ObjectPlacePanel
            entity={activeEntity}
            whyLinesKo={evidenceKo}
            onClose={() =>
              dispatchMobileWorkspace({ type: "collapse_callout" })
            }
            onPrepare={() => onPrepareReserve?.(activeEntity.id)}
            className="pointer-events-auto w-full max-w-lg"
          />
        </div>
      ) : null}

      {/* Agent Chat Card — Command Layer */}
      {mobile?.calloutMode !== "expanded" &&
      mobile?.calloutMode !== "full" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[40] flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <AgentChatCard
            className="pointer-events-auto w-full max-w-lg"
            contextEventId={eventId}
            placeholder={resolveRimvioCommandPlaceholder("workspace")}
            busy={busy}
            expanded={agentExpanded}
            onExpandedChange={setAgentExpanded}
            objects={
              agentExpanded
                ? (mobile?.entities ?? []).slice(0, 4).map((e) => ({
                    id: e.id,
                    title: e.title,
                    subtitleKo: e.priceLabelKo,
                  }))
                : []
            }
            onSubmit={(t) => void onCommand(t)}
            onPlus={() => imageInputRef.current?.click()}
            onFocusObject={(id) => {
              dispatchMobileWorkspace({ type: "set_active", entityId: id });
              dispatchMobileWorkspace({
                type: "set_callout_mode",
                mode: "expanded",
              });
              onSelectPin?.(id);
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void onPickImage(file);
            }}
          />
        </div>
      ) : null}

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
