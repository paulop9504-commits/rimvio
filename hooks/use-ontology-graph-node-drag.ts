"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeOntologyGraphNodeOffsets,
  separateOntologyGraphNodes,
  type OntologyGraphNodeBox,
} from "@/lib/globe/separate-ontology-graph-nodes";

const LONG_PRESS_MS = 460;
const DRAG_THRESHOLD_PX = 5;

type DragSession = {
  nodeId: string;
  pointerId: number;
  startX: number;
  startY: number;
  startDx: number;
  startDy: number;
  dragging: boolean;
  moved: boolean;
  suppressClick: boolean;
};

export type NodeDragBinding = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
  onClick: (event: React.MouseEvent) => void;
};

/** Long-press then drag — tap without hold fires onNodeTap. */
export function useNodeDragOffsets(input: {
  scopeKey: string;
  onNodeTap?: (nodeId: string) => void;
  onDragEnd?: (
    nodeId: string,
    offset: { dx: number; dy: number },
    allOffsets: Record<string, { dx: number; dy: number }>,
  ) => Record<string, { dx: number; dy: number }> | void;
}) {
  const [userOffsets, setUserOffsets] = useState<
    Record<string, { dx: number; dy: number }>
  >({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [armedNodeId, setArmedNodeId] = useState<string | null>(null);

  const sessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const offsetsRef = useRef(userOffsets);
  const onDragEndRef = useRef(input.onDragEnd);
  const onNodeTapRef = useRef(input.onNodeTap);

  useEffect(() => {
    offsetsRef.current = userOffsets;
  }, [userOffsets]);

  useEffect(() => {
    onDragEndRef.current = input.onDragEnd;
    onNodeTapRef.current = input.onNodeTap;
  }, [input.onDragEnd, input.onNodeTap]);

  useEffect(() => {
    setUserOffsets({});
    setDraggingNodeId(null);
    setArmedNodeId(null);
  }, [input.scopeKey]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const bindNode = useCallback(
    (nodeId: string): NodeDragBinding => ({
      onPointerDown: (event) => {
        if (event.button !== 0) {
          return;
        }
        clearLongPressTimer();
        const current = offsetsRef.current[nodeId] ?? { dx: 0, dy: 0 };
        sessionRef.current = {
          nodeId,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startDx: current.dx,
          startDy: current.dy,
          dragging: false,
          moved: false,
          suppressClick: false,
        };
        setArmedNodeId(nodeId);
        event.currentTarget.setPointerCapture(event.pointerId);
        longPressTimerRef.current = window.setTimeout(() => {
          const session = sessionRef.current;
          if (!session || session.nodeId !== nodeId) {
            return;
          }
          session.dragging = true;
          session.suppressClick = true;
          setDraggingNodeId(nodeId);
          setArmedNodeId(null);
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event) => {
        const session = sessionRef.current;
        if (!session || session.nodeId !== nodeId || session.pointerId !== event.pointerId) {
          return;
        }
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        if (!session.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          clearLongPressTimer();
          setArmedNodeId(null);
        }
        if (!session.dragging) {
          return;
        }
        session.moved = true;
        event.preventDefault();
        setUserOffsets((current) => ({
          ...current,
          [nodeId]: {
            dx: session.startDx + dx,
            dy: session.startDy + dy,
          },
        }));
      },
      onPointerUp: (event) => {
        const session = sessionRef.current;
        clearLongPressTimer();
        if (!session || session.nodeId !== nodeId || session.pointerId !== event.pointerId) {
          return;
        }
        const nextOffset = {
          dx: session.startDx + (event.clientX - session.startX),
          dy: session.startDy + (event.clientY - session.startY),
        };
        if (session.dragging && session.moved) {
          const merged = {
            ...offsetsRef.current,
            [nodeId]: nextOffset,
          };
          const resolved = onDragEndRef.current?.(nodeId, nextOffset, merged);
          setUserOffsets(resolved ?? merged);
        } else if (!session.suppressClick && !session.moved) {
          onNodeTapRef.current?.(nodeId);
        }
        sessionRef.current = null;
        setDraggingNodeId(null);
        setArmedNodeId(null);
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
      },
      onPointerCancel: () => {
        clearLongPressTimer();
        sessionRef.current = null;
        setDraggingNodeId(null);
        setArmedNodeId(null);
      },
      onClick: (event) => {
        if (sessionRef.current?.suppressClick || draggingNodeId === nodeId) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    }),
    [clearLongPressTimer, draggingNodeId],
  );

  return {
    userOffsets,
    draggingNodeId,
    armedNodeId,
    bindNode,
  };
}

export function useOntologyGraphNodeDrag(input: {
  graphKey: string;
  getBaseNodes: () => readonly OntologyGraphNodeBox[];
  onNodeTap?: (nodeId: string) => void;
  maxWidth?: number;
}) {
  const baseNodesRef = useRef(input.getBaseNodes);
  baseNodesRef.current = input.getBaseNodes;

  const resolveSeparatedOffsets = useCallback(
    (allOffsets: Record<string, { dx: number; dy: number }>) => {
      const merged = baseNodesRef.current().map((node) =>
        mergeOntologyGraphNodeOffsets(node, allOffsets[node.id]),
      );
      const separated = separateOntologyGraphNodes({
        nodes: merged,
        width: input.maxWidth ?? 360,
        maxWidth: input.maxWidth ?? 360,
      });
      const nextOffsets: Record<string, { dx: number; dy: number }> = {};
      for (const node of separated.nodes) {
        const base = baseNodesRef.current().find((row) => row.id === node.id);
        if (!base) {
          continue;
        }
        nextOffsets[node.id] = {
          dx: node.centerX - base.centerX,
          dy: node.centerY - base.centerY,
        };
      }
      return nextOffsets;
    },
    [input.maxWidth],
  );

  const drag = useNodeDragOffsets({
    scopeKey: input.graphKey,
    onNodeTap: input.onNodeTap,
    onDragEnd: (_nodeId, _offset, allOffsets) => resolveSeparatedOffsets(allOffsets),
  });

  const resolveLayout = useCallback(() => {
    const merged = baseNodesRef.current().map((node) =>
      mergeOntologyGraphNodeOffsets(node, drag.userOffsets[node.id]),
    );
    return separateOntologyGraphNodes({
      nodes: merged,
      width: input.maxWidth ?? 360,
      maxWidth: input.maxWidth ?? 360,
    });
  }, [drag.userOffsets, input.maxWidth]);

  return {
    ...drag,
    resolveLayout,
  };
}
