import type { ContextField } from "@/lib/hub/capability/types";

export type ContextTreeNode = {
  id: string;
  label: string;
  type?: string;
  path?: string;
  children?: ContextTreeNode[];
};

export const RIMVIO_CONTEXT_TREE: ContextTreeNode[] = [
  {
    id: "user",
    label: "User",
    children: [
      { id: "user.id", label: "user.id", type: "string", path: "user.id" },
      { id: "user.name", label: "user.name", type: "string", path: "user.name" },
      {
        id: "user.preferences",
        label: "user.preferences",
        type: "object",
        path: "user.preferences",
      },
    ],
  },
  {
    id: "device",
    label: "Device",
    children: [
      { id: "device.type", label: "device.type", type: "string", path: "device.type" },
      { id: "device.os", label: "device.os", type: "string", path: "device.os" },
      {
        id: "device.locale",
        label: "device.locale",
        type: "string",
        path: "device.locale",
      },
    ],
  },
  {
    id: "location",
    label: "Location",
    children: [
      {
        id: "location.current",
        label: "location.current",
        type: "object",
        path: "location.current",
      },
    ],
  },
  {
    id: "objects",
    label: "Objects",
    children: [
      { id: "product", label: "product", type: "object", path: "objects.product" },
      { id: "cart", label: "cart", type: "object", path: "objects.cart" },
      { id: "order", label: "order", type: "object", path: "objects.order" },
    ],
  },
  {
    id: "events",
    label: "Events",
    children: [
      {
        id: "user.intent",
        label: "user.intent",
        type: "object",
        path: "events.user.intent",
      },
      {
        id: "purchase_event",
        label: "purchase_event",
        type: "object",
        path: "events.purchase_event",
      },
    ],
  },
  {
    id: "session",
    label: "Session",
    children: [
      {
        id: "session.id",
        label: "session.id",
        type: "string",
        path: "session.id",
      },
    ],
  },
];

export function flattenContextTree(nodes: ContextTreeNode[]): ContextField[] {
  const out: ContextField[] = [];
  for (const node of nodes) {
    if (node.path && node.type) {
      out.push({
        id: node.id,
        label: node.label,
        type: node.type,
        path: node.path,
      });
    }
    if (node.children) {
      out.push(...flattenContextTree(node.children));
    }
  }
  return out;
}

export const ALL_CONTEXT_FIELDS = flattenContextTree(RIMVIO_CONTEXT_TREE);
