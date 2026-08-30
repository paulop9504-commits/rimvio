"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import {
  cartSubtotal,
  cartTotal,
  DELIVERY_FEE_KRW,
  formatOrderMoneyKrw,
  listOrderMetadata,
  menuForStore,
  projectOrderHeadline,
  projectOrderMetadataTree,
  projectOrderSubline,
  projectStatusLabel,
  type CartLine,
  type ExperienceSurfaceId,
  type OrderMetadata,
  type OrderRecord,
  type StoreRecord,
} from "@/lib/experience-app";

export type SurfaceOverlayProps = {
  readonly surface: ExperienceSurfaceId;
  readonly context: Readonly<Record<string, unknown>>;
  readonly stores: readonly StoreRecord[];
  readonly cartItems: readonly CartLine[];
  readonly orders: readonly OrderRecord[];
  readonly stats: { count: number; salesKrw: number; preparing: number; delivering: number } | null;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onSelectStore: (store: StoreRecord) => void;
  readonly onOpenMenu: (store: StoreRecord) => void;
  readonly onOpenCart: () => void;
  readonly onOpenCheckout: () => void;
  readonly onUpdateCart: (items: readonly CartLine[]) => void;
  readonly onPlaceOrder: () => void;
  readonly onOpenTracking: (orderId: string) => void;
  readonly onAdvanceOrder: (orderId: string) => void;
  readonly onCancelOrder: (orderId: string) => void;
  readonly onMerchantTab: (surface: ExperienceSurfaceId) => void;
};

export function SurfaceOverlay(props: SurfaceOverlayProps) {
  const [showMetaFor, setShowMetaFor] = useState<string | null>(null);
  const title = surfaceTitle(props.surface);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#f4f6fb]"
    >
      <header className="flex items-center gap-2 border-b border-[#e5e7eb] bg-white/95 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={props.onBack}
          className="flex size-10 items-center justify-center rounded-xl hover:bg-[#f3f4f6]"
          aria-label="뒤로"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">{title}</p>
        <button
          type="button"
          onClick={props.onClose}
          className="flex size-10 items-center justify-center rounded-xl hover:bg-[#f3f4f6]"
          aria-label="닫기"
        >
          <X className="size-5" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(5rem,env(safe-area-inset-bottom))]">
        <SurfaceBody {...props} showMetaFor={showMetaFor} onMeta={setShowMetaFor} />
      </main>
    </motion.div>
  );
}

function SurfaceBody(
  props: SurfaceOverlayProps & {
    readonly showMetaFor: string | null;
    readonly onMeta: (id: string | null) => void;
  },
) {
  switch (props.surface) {
    case "map":
      return <MapSurface stores={props.stores} onSelect={props.onSelectStore} />;
    case "restaurant":
      return (
        <RestaurantSurface
          store={props.context.store as StoreRecord}
          onMenu={() => props.onOpenMenu(props.context.store as StoreRecord)}
        />
      );
    case "menu":
      return (
        <MenuSurface
          store={props.context.store as StoreRecord}
          cartItems={props.cartItems}
          onAdd={(line) => {
            const existing = props.cartItems.find((c) => c.itemId === line.itemId);
            const next = existing
              ? props.cartItems.map((c) =>
                  c.itemId === line.itemId ? { ...c, qty: c.qty + 1 } : c,
                )
              : [...props.cartItems, line];
            props.onUpdateCart(next);
          }}
          onCart={props.onOpenCart}
        />
      );
    case "cart":
      return (
        <CartSurface
          storeName={String(props.context.storeName ?? "")}
          items={props.cartItems}
          onUpdate={props.onUpdateCart}
          onCheckout={props.onOpenCheckout}
        />
      );
    case "checkout":
      return (
        <CheckoutSurface
          storeName={String(props.context.storeName ?? "")}
          items={props.cartItems}
          onPlace={props.onPlaceOrder}
        />
      );
    case "order-complete":
      return (
        <OrderCompleteSurface
          order={props.context.order as OrderRecord}
          onTrack={() => props.onOpenTracking((props.context.order as OrderRecord).id)}
          onClose={props.onClose}
        />
      );
    case "order-tracking":
      return (
        <TrackingSurface
          order={props.context.order as OrderRecord}
          onCancel={() => props.onCancelOrder((props.context.order as OrderRecord).id)}
        />
      );
    case "merchant-home":
      return (
        <MerchantHomeSurface stats={props.stats} onTab={props.onMerchantTab} />
      );
    case "merchant-orders":
      return (
        <MerchantOrdersSurface
          orders={props.orders}
          showMetaFor={props.showMetaFor}
          onMeta={props.onMeta}
          onAdvance={props.onAdvanceOrder}
          onCancel={props.onCancelOrder}
        />
      );
    case "merchant-store":
    case "merchant-customers":
    case "merchant-settlement":
    case "merchant-menu":
    case "merchant-delivery":
      return <PlaceholderSurface surface={props.surface} />;
    default:
      return null;
  }
}

function surfaceTitle(surface: ExperienceSurfaceId): string {
  const map: Partial<Record<ExperienceSurfaceId, string>> = {
    map: "근처 지도",
    restaurant: "매장",
    menu: "메뉴",
    cart: "장바구니",
    checkout: "결제",
    "order-complete": "주문 완료",
    "order-tracking": "배달 추적",
    "merchant-home": "우리동네 배달",
    "merchant-orders": "주문 관리",
    "merchant-menu": "메뉴 관리",
    "merchant-store": "매장 관리",
    "merchant-customers": "고객 관리",
    "merchant-delivery": "배달 관리",
    "merchant-settlement": "정산",
  };
  return map[surface] ?? "Rimvio";
}

function MapSurface(props: {
  readonly stores: readonly StoreRecord[];
  readonly onSelect: (store: StoreRecord) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-[#dbe7f3] p-3 shadow-sm">
        <div className="relative h-48 rounded-xl bg-gradient-to-br from-[#9ec0e0] to-[#c5d9ec]">
          {props.stores.map((store, i) => (
            <button
              key={store.id}
              type="button"
              onClick={() => props.onSelect(store)}
              className="absolute rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold shadow-md"
              style={{ left: `${14 + i * 26}%`, top: `${24 + (i % 2) * 32}%` }}
            >
              {store.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {props.stores.map((store) => (
          <li key={store.id}>
            <button
              type="button"
              onClick={() => props.onSelect(store)}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm"
            >
              <div className="text-left">
                <p className="text-[13px] font-semibold">{store.name}</p>
                <p className="text-[11px] text-[#6b7280]">
                  ⭐ 4.8 · 도보 {store.walkMinutes}분 · 25~35분
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#6366f1]">{copy.experienceApp.viewMenu}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RestaurantSurface(props: {
  readonly store: StoreRecord;
  readonly onMenu: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="h-36 rounded-t-2xl bg-gradient-to-br from-amber-100 to-orange-200" />
      <div className="p-4">
        <p className="text-[18px] font-bold">{props.store.name}</p>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          ⭐ 4.8 · 도보 {props.store.walkMinutes}분 · 최소주문 ₩15,000
        </p>
        <button
          type="button"
          onClick={props.onMenu}
          className="mt-4 w-full rounded-2xl bg-[#6366f1] py-3 text-[14px] font-semibold text-white"
        >
          {copy.experienceApp.viewMenu}
        </button>
      </div>
    </div>
  );
}

function MenuSurface(props: {
  readonly store: StoreRecord;
  readonly cartItems: readonly CartLine[];
  readonly onAdd: (line: CartLine) => void;
  readonly onCart: () => void;
}) {
  const menu = menuForStore(props.store.id);
  const count = props.cartItems.reduce((s, c) => s + c.qty, 0);
  return (
    <div>
      <p className="text-[16px] font-bold">{props.store.name}</p>
      <ul className="mt-3 space-y-2">
        {menu.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="size-14 shrink-0 rounded-xl bg-gradient-to-br from-amber-50 to-orange-100" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{item.name}</p>
              <p className="text-[11px] text-[#6b7280]">{item.categoryKo}</p>
              <p className="mt-1 text-[12px] font-semibold">{formatOrderMoneyKrw(item.priceKrw)}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                props.onAdd({
                  itemId: item.id,
                  name: item.name,
                  priceKrw: item.priceKrw,
                  qty: 1,
                })
              }
              className="self-center rounded-lg bg-[#111827] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              담기
            </button>
          </li>
        ))}
      </ul>
      {count > 0 ? (
        <button
          type="button"
          onClick={props.onCart}
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-[398px] rounded-2xl bg-[#6366f1] py-3.5 text-[14px] font-semibold text-white shadow-lg"
        >
          장바구니 · {count}개
        </button>
      ) : null}
    </div>
  );
}

function CartSurface(props: {
  readonly storeName: string;
  readonly items: readonly CartLine[];
  readonly onUpdate: (items: readonly CartLine[]) => void;
  readonly onCheckout: () => void;
}) {
  const updateQty = (itemId: string, delta: number) => {
    props.onUpdate(
      props.items
        .map((item) =>
          item.itemId === itemId ? { ...item, qty: Math.max(0, item.qty + delta) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };
  return (
    <div className="space-y-3">
      <p className="text-[14px] font-semibold">{props.storeName}</p>
      <ul className="space-y-2">
        {props.items.map((item) => (
          <li key={item.itemId} className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
            <div>
              <p className="text-[13px] font-semibold">{item.name}</p>
              <p className="text-[11px] text-[#6b7280]">{formatOrderMoneyKrw(item.priceKrw)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => updateQty(item.itemId, -1)} className="rounded-lg border p-1">
                <Minus className="size-3" />
              </button>
              <span className="min-w-[1.5rem] text-center text-[13px] font-semibold">{item.qty}</span>
              <button type="button" onClick={() => updateQty(item.itemId, 1)} className="rounded-lg border p-1">
                <Plus className="size-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-white p-3 text-[12px] shadow-sm">
        <Row label="소계" value={formatOrderMoneyKrw(cartSubtotal(props.items))} />
        <Row label="배달비" value={formatOrderMoneyKrw(DELIVERY_FEE_KRW)} />
        <Row label="합계" value={formatOrderMoneyKrw(cartTotal(props.items))} bold />
      </div>
      <button
        type="button"
        disabled={props.items.length === 0}
        onClick={props.onCheckout}
        className="w-full rounded-2xl bg-[#6366f1] py-3.5 text-[14px] font-semibold text-white disabled:opacity-40"
      >
        결제하기
      </button>
    </div>
  );
}

function CheckoutSurface(props: {
  readonly storeName: string;
  readonly items: readonly CartLine[];
  readonly onPlace: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-[11px] text-[#9ca3af]">배달 주소</p>
        <p className="text-[13px] font-semibold">서울 강남구 역삼동</p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-[11px] text-[#9ca3af]">결제 수단</p>
        <p className="text-[13px] font-semibold">카카오페이</p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-[13px] font-semibold">{props.storeName}</p>
        <p className="mt-1 text-[12px] text-[#6b7280]">
          {props.items.map((i) => `${i.name}×${i.qty}`).join(" · ")}
        </p>
        <p className="mt-2 text-[15px] font-bold">{formatOrderMoneyKrw(cartTotal(props.items))}</p>
      </div>
      <button
        type="button"
        onClick={props.onPlace}
        className="w-full rounded-2xl bg-[#6366f1] py-3.5 text-[14px] font-semibold text-white"
      >
        {formatOrderMoneyKrw(cartTotal(props.items))} 주문하기
      </button>
    </div>
  );
}

function OrderCompleteSurface(props: {
  readonly order: OrderRecord;
  readonly onTrack: () => void;
  readonly onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-4 py-10 text-center shadow-sm">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
      <p className="mt-4 text-[18px] font-bold">주문 완료</p>
      <p className="mt-1 text-[13px] text-[#6b7280]">{props.order.storeName}</p>
      <p className="mt-1 text-[12px] text-[#374151]">
        {props.order.lines.map((l) => l.name).join(" · ")} · {formatOrderMoneyKrw(props.order.totalKrw)}
      </p>
      <p className="mt-2 text-[11px] text-[#9ca3af]">주문 #{props.order.displayId} · 예상 20~30분</p>
      <button
        type="button"
        onClick={props.onTrack}
        className="mt-6 w-full rounded-2xl bg-[#6366f1] py-3 text-[14px] font-semibold text-white"
      >
        배달 추적
      </button>
      <button type="button" onClick={props.onClose} className="mt-2 text-[12px] font-semibold text-[#6366f1]">
        채팅으로 돌아가기
      </button>
    </div>
  );
}

function TrackingSurface(props: {
  readonly order: OrderRecord;
  readonly onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#111318] p-4 text-[#f2f4f6] shadow-sm">
      <p className="text-[11px] text-[#9ca3af]">주문 #{props.order.displayId}</p>
      <p className="mt-1 text-[16px] font-semibold">{projectOrderHeadline("consumer", props.order)}</p>
      <p className="mt-1 text-[12px] text-[#9ca3af]">{projectOrderSubline("consumer", props.order)}</p>
      <ol className="mt-4 space-y-2 text-[12px]">
        {(["received", "preparing", "ready", "delivering", "delivered"] as const).map((status) => (
          <li key={status} className={props.order.status === status ? "text-violet-300" : "text-[#6b7280]"}>
            {props.order.status === status ? "●" : "○"} {projectStatusLabel("merchant", status)}
          </li>
        ))}
      </ol>
      {props.order.status === "received" || props.order.status === "preparing" ? (
        <button type="button" onClick={props.onCancel} className="mt-4 text-[12px] font-semibold text-red-300">
          주문 취소
        </button>
      ) : null}
    </div>
  );
}

function MerchantHomeSurface(props: {
  readonly stats: { count: number; salesKrw: number; preparing: number; delivering: number } | null;
  readonly onTab: (surface: ExperienceSurfaceId) => void;
}) {
  const items: Array<{ id: ExperienceSurfaceId; label: string }> = [
    { id: "merchant-orders", label: "주문 관리" },
    { id: "merchant-menu", label: "메뉴 관리" },
    { id: "merchant-store", label: "매장 관리" },
    { id: "merchant-customers", label: "고객 관리" },
    { id: "merchant-delivery", label: "배달 관리" },
    { id: "merchant-settlement", label: "정산" },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-[#111318] p-4 text-white">
        <p className="text-[11px] text-[#9ca3af]">운영중</p>
        {props.stats ? (
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <p>오늘 주문 {props.stats.count}건</p>
            <p>매출 {formatOrderMoneyKrw(props.stats.salesKrw)}</p>
            <p>조리중 {props.stats.preparing}건</p>
            <p>배달중 {props.stats.delivering}건</p>
          </div>
        ) : null}
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => props.onTab(item.id)}
              className="w-full rounded-2xl bg-white px-3 py-3.5 text-left text-[13px] font-semibold shadow-sm"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MerchantOrdersSurface(props: {
  readonly orders: readonly OrderRecord[];
  readonly showMetaFor: string | null;
  readonly onMeta: (id: string | null) => void;
  readonly onAdvance: (id: string) => void;
  readonly onCancel: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {props.orders.map((order) => {
        const meta = props.showMetaFor === order.id ? listOrderMetadata(order.id) : [];
        return (
          <li key={order.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold">{projectOrderHeadline("merchant", order)}</p>
                <p className="text-[11px] text-[#6b7280]">{projectOrderSubline("merchant", order)}</p>
              </div>
              <button
                type="button"
                onClick={() => props.onMeta(props.showMetaFor === order.id ? null : order.id)}
                className="text-[10px] font-semibold text-[#6366f1]"
              >
                {copy.experienceApp.metadataTitle}
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              {order.status !== "delivered" && order.status !== "cancelled" ? (
                <button
                  type="button"
                  onClick={() => props.onAdvance(order.id)}
                  className="rounded-lg bg-[#111827] px-2.5 py-1 text-[11px] font-semibold text-white"
                >
                  다음 상태
                </button>
              ) : null}
            </div>
            {props.showMetaFor === order.id ? (
              <MetadataTree order={order} rows={meta} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function MetadataTree(props: { readonly order: OrderRecord; readonly rows: readonly OrderMetadata[] }) {
  const tree = projectOrderMetadataTree(props.order, props.rows);
  return (
    <div className="mt-2 space-y-1 rounded-xl bg-[#f8fafc] p-2 font-mono text-[10px] text-[#374151]">
      <p>
        <span className="font-semibold">{copy.experienceApp.metadataConsumer}</span> {tree.consumer}
      </p>
      <p>
        <span className="font-semibold">{copy.experienceApp.metadataRestaurant}</span> {tree.restaurant}
      </p>
      {tree.actions.map((a) => (
        <p key={a.at}>
          <span className="font-semibold">{copy.experienceApp.metadataAction}</span> {a.label}
        </p>
      ))}
      <p>
        <span className="font-semibold">{copy.experienceApp.metadataCapability}</span>{" "}
        {tree.capabilities.join(", ")}
      </p>
      <p>
        <span className="font-semibold">{copy.experienceApp.metadataInfrastructure}</span>{" "}
        {tree.infrastructure.join(", ")}
      </p>
    </div>
  );
}

function PlaceholderSurface(props: { readonly surface: ExperienceSurfaceId }) {
  const copyMap: Partial<Record<ExperienceSurfaceId, string>> = {
    "merchant-store": copy.experienceApp.merchantStoresSoon,
    "merchant-customers": copy.experienceApp.merchantCustomersSoon,
    "merchant-settlement": copy.experienceApp.merchantSettlementSoon,
    "merchant-menu": "메뉴 관리는 곧 연결돼요.",
    "merchant-delivery": "배달 관리는 곧 연결돼요.",
  };
  return (
    <p className="rounded-2xl bg-white px-3 py-8 text-center text-[13px] text-[#6b7280] shadow-sm">
      {copyMap[props.surface] ?? "준비 중이에요."}
    </p>
  );
}

function Row(props: { readonly label: string; readonly value: string; readonly bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#6b7280]">{props.label}</span>
      <span className={cn(props.bold && "font-bold")}>{props.value}</span>
    </div>
  );
}

export function SurfaceStackHost(props: SurfaceOverlayProps & { readonly visible: boolean }) {
  return (
    <AnimatePresence>
      {props.visible ? <SurfaceOverlay {...props} /> : null}
    </AnimatePresence>
  );
}
