export type {
  ExperienceActor,
  ExperienceAppRole,
  ExperienceService,
  MenuItem,
  OrderLine,
  OrderMetadata,
  OrderRecord,
  OrderStatus,
  StoreRecord,
} from "@/lib/experience-app/types";

export {
  DEFAULT_ACTORS,
  readExperienceActor,
  readExperienceRole,
  subscribeExperienceRole,
  writeExperienceRole,
} from "@/lib/experience-app/role-store";

export {
  advanceExperienceOrder,
  appendOrderMetadata,
  createExperienceOrder,
  getExperienceOrder,
  listExperienceOrders,
  listOrderMetadata,
  nextStatusFor,
  resetExperienceOrders,
  subscribeExperienceOrders,
  updateExperienceOrderStatus,
} from "@/lib/experience-app/order-store";

export {
  canAdvanceOrder,
  canCancelOrder,
  canViewOrder,
  denyReasonKo,
} from "@/lib/experience-app/permission";

export {
  formatOrderMoneyKrw,
  projectOrderHeadline,
  projectOrderSubline,
  projectStatusLabel,
} from "@/lib/experience-app/projection";

export {
  projectOrderMetadataTree,
  type OrderMetadataTree,
} from "@/lib/experience-app/metadata-projection";

export {
  parseExperienceAppUtterance,
  wantsExperienceAppUse,
} from "@/lib/experience-app/parse-utterance";

export type {
  ActionMetadataRecord,
  ActivityRecord,
  AgentActionCard,
  AgentChatTurn,
  ApplicationSessionContext,
  CartLine,
  ExperienceSurfaceId,
  SurfaceFrame,
} from "@/lib/experience-app/surface-types";

export {
  cartSubtotal,
  cartTotal,
  DELIVERY_FEE_KRW,
  menuToCartLine,
  orderToActivity,
} from "@/lib/experience-app/surface-types";

export {
  closeSurfaceStack,
  patchSessionContext,
  popSurface,
  pushSurface,
  readSessionContext,
  readSurfaceStack,
  readTopSurface,
  replaceSurfaceStack,
  resetSurfaceStackSession,
  setCartItems,
  setSessionRole,
  setSessionStores,
  subscribeSurfaceStack,
} from "@/lib/experience-app/surface-stack-store";

export {
  appendChatTurn,
  readChatTurns,
  resetChatTurns,
  subscribeChatTurns,
} from "@/lib/experience-app/chat-session-store";

export {
  listActionMetadata,
  recordActionMetadata,
  resetActionMetadata,
  subscribeActionMetadata,
} from "@/lib/experience-app/action-metadata-store";

export {
  getActivityByOrderId,
  listActivities,
  resetActivities,
  subscribeActivities,
  upsertActivity,
} from "@/lib/experience-app/activity-store";

export { runExperienceOp } from "@/lib/experience-app/run-experience-op";

export {
  DEMO_MENU,
  DEMO_STORES,
  EXPERIENCE_SERVICES,
  LOCAL_DELIVERY_SERVICE,
  menuForStore,
  seedDemoOrdersIfEmpty,
  storesForQuery,
} from "@/lib/experience-app/seed";
