"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, Search, Sparkles, User } from "lucide-react";
import { RimvioLogo } from "@/components/rimvio-logo";
import { AgentChatThread } from "@/components/experience-app/agent-chat-thread";
import { ExperienceDrawer } from "@/components/experience-app/experience-drawer";
import { SurfaceStackHost } from "@/components/experience-app/surface-overlay";
import { copy } from "@/lib/copy/human-ko";
import { createDefaultPlatformDraft } from "@/lib/hub/platform/defaults";
import {
  appendChatTurn,
  closeSurfaceStack,
  DEMO_STORES,
  getExperienceOrder,
  listActivities,
  orderToActivity,
  parseExperienceAppUtterance,
  patchSessionContext,
  popSurface,
  projectOrderHeadline,
  pushSurface,
  readChatTurns,
  readExperienceActor,
  readExperienceRole,
  readSessionContext,
  readSurfaceStack,
  readTopSurface,
  runExperienceOp,
  seedDemoOrdersIfEmpty,
  setCartItems,
  setSessionRole,
  setSessionStores,
  subscribeActivities,
  subscribeChatTurns,
  subscribeExperienceOrders,
  subscribeExperienceRole,
  subscribeSurfaceStack,
  upsertActivity,
  writeExperienceRole,
  type ActivityRecord,
  type AgentActionCard,
  type CartLine,
  type ExperienceAppRole,
  type ExperienceSurfaceId,
  type OrderRecord,
  type StoreRecord,
} from "@/lib/experience-app";

export function ExperienceAgentHome() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<ExperienceAppRole>("consumer");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [turns, setTurns] = useState(readChatTurns());
  const [stackTick, setStackTick] = useState(0);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{
    count: number;
    salesKrw: number;
    preparing: number;
    delivering: number;
  } | null>(null);

  const draft = useMemo(() => createDefaultPlatformDraft(), []);
  const actor = readExperienceActor(role);
  const topSurface = readTopSurface();
  void stackTick;

  const reloadOrders = useCallback(async () => {
    const result = await runExperienceOp("order.list", {}, { draft, actor });
    if (result.ok) {
      setOrders((result.data as { orders?: OrderRecord[] }).orders ?? []);
    }
    if (role === "merchant") {
      const s = await runExperienceOp("order.stats", {}, { draft, actor });
      if (s.ok) setStats(s.data as typeof stats);
    }
  }, [actor, draft, role]);

  useEffect(() => {
    seedDemoOrdersIfEmpty();
    const roleParam = searchParams.get("role");
    if (roleParam === "consumer" || roleParam === "merchant" || roleParam === "courier") {
      writeExperienceRole(roleParam);
      setRole(roleParam);
      setSessionRole(roleParam);
    } else {
      const r = readExperienceRole();
      setRole(r);
      setSessionRole(r);
    }
    setTurns(readChatTurns());
    return subscribeExperienceRole(() => {
      const r = readExperienceRole();
      setRole(r);
      setSessionRole(r);
    });
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q) return;
    setAsk(q);
    void handleSubmit(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    void reloadOrders();
    return subscribeExperienceOrders(() => void reloadOrders());
  }, [reloadOrders]);

  useEffect(() => {
    setActivities([...listActivities()]);
    return subscribeActivities(() => setActivities([...listActivities()]));
  }, []);

  useEffect(() => subscribeChatTurns(() => setTurns(readChatTurns())), []);
  useEffect(() => subscribeSurfaceStack(() => setStackTick((v) => v + 1)), []);

  const switchRole = (next: ExperienceAppRole) => {
    writeExperienceRole(next);
    setRole(next);
    setSessionRole(next);
    setDrawerOpen(false);
    appendChatTurn({
      role: "assistant",
      text:
        next === "merchant"
          ? "점주 맥락으로 전환했어요. 주문·매출을 물어보세요."
          : "소비자 맥락으로 전환했어요. 주문이나 배달 추적을 말해 주세요.",
    });
  };

  const handleSubmit = async (text: string) => {
    const utterance = text.trim();
    if (!utterance) return;
    setBusy(true);
    setAsk("");
    appendChatTurn({ role: "user", text: utterance });

    const parsed = parseExperienceAppUtterance(utterance);
    if (!parsed) {
      setBusy(false);
      appendChatTurn({
        role: "assistant",
        text: "주문·배달 추적·매장 관리를 말해 주세요.",
      });
      return;
    }

    const activeRole = parsed.roleHint ?? role;
    if (parsed.roleHint && parsed.roleHint !== role) switchRole(parsed.roleHint);

    patchSessionContext({ lastIntent: parsed.op });
    const result = await runExperienceOp(parsed.op, parsed.args, {
      draft,
      actor: readExperienceActor(activeRole),
      surface: topSurface?.surface,
    });
    setBusy(false);

    if (!result.ok) {
      appendChatTurn({ role: "assistant", text: result.errorKo ?? "실행하지 못했어요." });
      return;
    }

    await handleOpResult(parsed.op, result.data as Record<string, unknown>, activeRole);
    void reloadOrders();
  };

  const handleOpResult = async (
    op: string,
    data: Record<string, unknown>,
    activeRole: ExperienceAppRole,
  ) => {
    if (op === "order.searchStores") {
      const stores = (data.stores as StoreRecord[]) ?? DEMO_STORES;
      setSessionStores(stores);
      const summary = stores.map((s) => `${s.name}(도보 ${s.walkMinutes}분)`).join(" · ");
      const cards: AgentActionCard[] = [
        { kind: "open_surface", label: copy.experienceApp.viewOnMap, surface: "map" },
        ...stores.slice(0, 2).map((store) => ({
          kind: "store_card" as const,
          label: copy.experienceApp.viewMenu,
          surface: "restaurant" as ExperienceSurfaceId,
          payload: { store },
        })),
      ];
      appendChatTurn({
        role: "assistant",
        text: `${copy.experienceApp.chatStoreFound} ${summary}`,
        cards,
      });
      return;
    }

    if (op === "order.stats") {
      const s = data as { count: number; salesKrw: number; preparing: number; delivering: number };
      setStats(s);
      appendChatTurn({
        role: "assistant",
        text: `오늘 ${s.count}건의 주문이 들어왔어요. 조리 중 ${s.preparing}건, 배달 중 ${s.delivering}건입니다.`,
        cards: [
          {
            kind: "merchant_surface",
            label: "주문 관리",
            surface: "merchant-orders",
          },
          {
            kind: "merchant_surface",
            label: "현황",
            surface: "merchant-home",
          },
        ],
      });
      return;
    }

    if (op === "order.status") {
      const order = data.order as OrderRecord | undefined;
      if (!order) {
        appendChatTurn({ role: "assistant", text: "진행 중인 주문이 없어요." });
        return;
      }
      appendOrderStatusReply(order, activeRole);
      return;
    }

    if (op === "order.list") {
      const order = (data.orders as OrderRecord[] | undefined)?.[0];
      if (!order) {
        appendChatTurn({ role: "assistant", text: "진행 중인 주문이 없어요." });
        return;
      }
      appendOrderStatusReply(order, activeRole);
      return;
    }

    if (op === "order.cancel") {
      const order = data.order as OrderRecord | undefined;
      appendChatTurn({
        role: "assistant",
        text: order ? `주문 #${order.displayId}을 취소했어요.` : "취소했어요.",
      });
    }
  };

  const handleActionCard = (card: AgentActionCard) => {
    if (card.kind === "store_card" && card.payload?.store) {
      const store = card.payload.store as StoreRecord;
      patchSessionContext({ restaurantId: store.id, restaurantName: store.name });
      pushSurface("restaurant", { store }, "map");
      setStackTick((v) => v + 1);
      return;
    }
    if (card.kind === "order_card") {
      const orderId = String(card.payload?.orderId ?? readSessionContext().activeOrderId ?? "");
      const order = orderId ? getExperienceOrder(orderId) : orders[0];
      if (!order) return;
      const surface: ExperienceSurfaceId =
        card.surface ?? (role === "merchant" ? "merchant-orders" : "order-tracking");
      pushSurface(surface, { order });
      setStackTick((v) => v + 1);
      return;
    }
    if (card.surface) {
      const ctx = readSessionContext();
      if (card.surface === "map") {
        pushSurface("map", { stores: ctx.stores });
      } else if (card.surface === "cart") {
        pushSurface("cart", { storeName: ctx.restaurantName });
      } else if (card.surface === "order-tracking") {
        const orderId = String(card.payload?.orderId ?? ctx.activeOrderId ?? "");
        const order = orderId ? getExperienceOrder(orderId) : orders[0];
        if (order) pushSurface("order-tracking", { order });
      } else if (card.surface.startsWith("merchant")) {
        pushSurface(card.surface, {});
      } else {
        pushSurface(card.surface, card.payload ?? {});
      }
      setStackTick((v) => v + 1);
    }
  };

  const handleCloseStack = () => {
    const ctx = readSessionContext();
    closeSurfaceStack();
    setStackTick((v) => v + 1);
    if (ctx.cartItems.length > 0 && ctx.restaurantName) {
      const items = ctx.cartItems.map((c) => `${c.name}×${c.qty}`).join(", ");
      appendChatTurn({
        role: "assistant",
        text: `현재 ${ctx.restaurantName}의 ${items}을 장바구니에 담아둔 상태예요.`,
        cards: ctx.cartItems.length
          ? [{ kind: "open_surface", label: "장바구니 보기", surface: "cart" }]
          : undefined,
      });
    }
  };

  const handleBack = () => {
    popSurface();
    setStackTick((v) => v + 1);
  };

  const handleSelectStore = (store: StoreRecord) => {
    patchSessionContext({ restaurantId: store.id, restaurantName: store.name });
    pushSurface("restaurant", { store }, "map");
    setStackTick((v) => v + 1);
  };

  const handleOpenMenu = (store: StoreRecord) => {
    patchSessionContext({ restaurantId: store.id, restaurantName: store.name });
    pushSurface("menu", { store }, "restaurant");
    setStackTick((v) => v + 1);
  };

  const handleOpenCart = () => {
    const ctx = readSessionContext();
    pushSurface("cart", { storeName: ctx.restaurantName }, "menu");
    setStackTick((v) => v + 1);
  };

  const handleOpenCheckout = () => {
    const ctx = readSessionContext();
    pushSurface("checkout", { storeName: ctx.restaurantName }, "cart");
    setStackTick((v) => v + 1);
  };

  const handleUpdateCart = (items: readonly CartLine[]) => {
    setCartItems(items);
    setStackTick((v) => v + 1);
  };

  const handlePlaceOrder = async () => {
    const ctx = readSessionContext();
    if (!ctx.restaurantId || ctx.cartItems.length === 0) return;
    const lines = ctx.cartItems.map((c) => ({
      name: c.name,
      qty: c.qty,
      priceKrw: c.priceKrw,
    }));
    const result = await runExperienceOp(
      "order.create",
      {
        storeId: ctx.restaurantId,
        storeName: ctx.restaurantName ?? "매장",
        lines,
      },
      { draft, actor, surface: "checkout" },
    );
    if (!result.ok) {
      appendChatTurn({ role: "assistant", text: result.errorKo ?? "주문에 실패했어요." });
      return;
    }
    const order = (result.data as { order: OrderRecord }).order;
    setCartItems([]);
    patchSessionContext({ activeOrderId: order.id, cartItems: [] });
    const statusLabel = projectOrderHeadline("consumer", order);
    upsertActivity(orderToActivity(order, statusLabel));
    pushSurface("order-complete", { order }, "checkout");
    setStackTick((v) => v + 1);
    appendChatTurn({
      role: "assistant",
      text: `주문이 완료됐어요. ${order.storeName} · ${order.lines.map((l) => l.name).join(" + ")}, 총 ${order.totalKrw.toLocaleString("ko-KR")}원입니다. 예상 도착 20~30분이에요.`,
      cards: [
        { kind: "open_surface", label: "주문 추적", surface: "order-tracking", payload: { orderId: order.id } },
      ],
    });
    void reloadOrders();
  };

  const handleOpenTracking = (orderId: string) => {
    const order = getExperienceOrder(orderId);
    if (!order) return;
    closeSurfaceStack();
    pushSurface("order-tracking", { order });
    setStackTick((v) => v + 1);
  };

  const handleAdvanceOrder = async (orderId: string) => {
    await runExperienceOp("order.advance", { id: orderId }, {
      draft,
      actor: readExperienceActor("merchant"),
      surface: "merchant-orders",
    });
    const order = getExperienceOrder(orderId);
    if (order) {
      upsertActivity(
        orderToActivity(order, projectOrderHeadline("merchant", order)),
      );
    }
    void reloadOrders();
  };

  const handleCancelOrder = async (orderId: string) => {
    await runExperienceOp("order.cancel", { id: orderId }, { draft, actor, surface: topSurface?.surface });
    void reloadOrders();
  };

  const handleMerchantTab = (surface: ExperienceSurfaceId) => {
    pushSurface(surface, {});
    setStackTick((v) => v + 1);
  };

  const handleActivity = (activity: ActivityRecord) => {
    setDrawerOpen(false);
    if (!activity.orderId) return;
    const order = getExperienceOrder(activity.orderId);
    if (!order) return;
    pushSurface(role === "merchant" ? "merchant-orders" : "order-tracking", { order });
    setStackTick((v) => v + 1);
  };

  const handleNewChat = () => {
    setDrawerOpen(false);
    appendChatTurn({
      role: "assistant",
      text: "새 대화예요. 무엇을 도와드릴까요?",
    });
  };

  function appendOrderStatusReply(order: OrderRecord, activeRole: ExperienceAppRole) {
    const headline = projectOrderHeadline(activeRole, order);
    appendChatTurn({
      role: "assistant",
      text:
        activeRole === "consumer"
          ? `${headline} 완료되면 배달 기사에게 전달될 예정이에요.`
          : headline,
      cards: [
        {
          kind: "order_card",
          label: activeRole === "consumer" ? "주문 추적" : "주문 관리",
          surface: activeRole === "consumer" ? "order-tracking" : "merchant-orders",
          payload: {
            title: `#${order.displayId}`,
            subtitle: order.lines.map((l) => l.name).join(" · "),
            amountKrw: order.totalKrw,
            orderId: order.id,
          },
        },
      ],
    });
    patchSessionContext({ activeOrderId: order.id });
  }

  const surfaceVisible = readSurfaceStack().length > 0;
  const current = readTopSurface();
  const cartItems = readSessionContext().cartItems;
  const stores = readSessionContext().stores;

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col bg-[#f4f6fb] text-[#111827]">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm"
          aria-label="메뉴"
        >
          <Menu className="size-4" />
        </button>
        <RimvioLogo size="xs" showWordmark appearance="light" />
        <div className="flex gap-1">
          <button type="button" className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm" aria-label="검색">
            <Search className="size-4" />
          </button>
          <button type="button" className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm" aria-label="프로필">
            <User className="size-4" />
          </button>
        </div>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-24"
        aria-hidden={surfaceVisible}
      >
        <AgentChatThread turns={turns} busy={busy} onAction={handleActionCard} />
      </main>

      {!surfaceVisible ? (
        <form
          className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] gap-2 border-t border-[#e5e7eb] bg-white/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(ask);
          }}
        >
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder={
              role === "merchant" ? copy.experienceApp.merchantAsk : copy.experienceApp.consumerAsk
            }
            className="min-w-0 flex-1 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2.5 text-[13px] focus:border-violet-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !ask.trim()}
            className="rounded-xl bg-[#6366f1] px-3 py-2 text-white disabled:opacity-40"
            aria-label="보내기"
          >
            <Sparkles className="size-4" />
          </button>
        </form>
      ) : null}

      <SurfaceStackHost
        visible={surfaceVisible && current !== null}
        surface={current?.surface ?? "map"}
        context={current?.context ?? {}}
        stores={stores}
        cartItems={cartItems}
        orders={orders}
        stats={stats}
        onBack={handleBack}
        onClose={handleCloseStack}
        onSelectStore={handleSelectStore}
        onOpenMenu={handleOpenMenu}
        onOpenCart={handleOpenCart}
        onOpenCheckout={handleOpenCheckout}
        onUpdateCart={handleUpdateCart}
        onPlaceOrder={() => void handlePlaceOrder()}
        onOpenTracking={handleOpenTracking}
        onAdvanceOrder={(id) => void handleAdvanceOrder(id)}
        onCancelOrder={(id) => void handleCancelOrder(id)}
        onMerchantTab={handleMerchantTab}
      />

      <ExperienceDrawer
        open={drawerOpen}
        role={role}
        activities={activities}
        inProgressCount={orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length}
        onClose={() => setDrawerOpen(false)}
        onRole={switchRole}
        onActivity={handleActivity}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
