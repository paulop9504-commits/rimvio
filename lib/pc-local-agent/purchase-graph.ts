export const PURCHASE_GRAPH_NODES = [
  "FIND_PRODUCT",
  "SELECT_PRODUCT",
  "ADD_TO_CART",
  "BUY_NOW",
  "REVIEW_ORDER",
  "WAITING_USER_APPROVAL",
  "CHECKOUT",
  "VERIFY",
] as const;

export type PurchaseGraphNode = (typeof PURCHASE_GRAPH_NODES)[number];

export function isPurchaseGraphNode(value: unknown): value is PurchaseGraphNode {
  return (
    typeof value === "string" &&
    (PURCHASE_GRAPH_NODES as readonly string[]).includes(value)
  );
}

const ORDER: PurchaseGraphNode[] = [
  "FIND_PRODUCT",
  "SELECT_PRODUCT",
  "ADD_TO_CART",
  "REVIEW_ORDER",
  "WAITING_USER_APPROVAL",
  "CHECKOUT",
  "VERIFY",
];

export function canAdvancePurchaseNode(input: {
  from: PurchaseGraphNode;
  to: PurchaseGraphNode;
  userApproved: boolean;
}): boolean {
  if (input.from === input.to) {
    return true;
  }
  if (input.from === "ADD_TO_CART" && input.to === "BUY_NOW") {
    return true;
  }
  if (input.from === "BUY_NOW" && input.to === "REVIEW_ORDER") {
    return true;
  }
  if (input.from === "SELECT_PRODUCT" && input.to === "BUY_NOW") {
    return true;
  }
  if (input.from === "WAITING_USER_APPROVAL" && input.to === "CHECKOUT") {
    return input.userApproved;
  }
  if (input.to === "CHECKOUT" && !input.userApproved) {
    return false;
  }
  const fromIdx = ORDER.indexOf(input.from === "BUY_NOW" ? "ADD_TO_CART" : input.from);
  const toIdx = ORDER.indexOf(input.to === "BUY_NOW" ? "ADD_TO_CART" : input.to);
  if (fromIdx < 0 || toIdx < 0) {
    return false;
  }
  return toIdx >= fromIdx;
}

export function purchaseNodeForPhase(
  phase: string,
): PurchaseGraphNode | null {
  switch (phase) {
    case "BROWSER_OPENED":
    case "PAGE_READY":
    case "RUNNING":
      return "FIND_PRODUCT";
    case "ACTION_RUNNING":
      return "SELECT_PRODUCT";
    case "WAITING_USER":
      return "WAITING_USER_APPROVAL";
    case "APPROVED":
      return "CHECKOUT";
    case "VERIFYING":
    case "COMPLETED":
      return "VERIFY";
    default:
      return null;
  }
}
