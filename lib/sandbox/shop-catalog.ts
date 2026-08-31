export type ShopProduct = {
  id: string;
  name: string;
  price: string;
  category: string;
  url: string;
};

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "mbp-14",
    name: 'MacBook Pro 14"',
    price: "₩2,890,000",
    category: "laptop",
    url: "/sandbox/shop/products/mbp-14",
  },
  {
    id: "mba-15",
    name: 'MacBook Air 15"',
    price: "₩1,890,000",
    category: "laptop",
    url: "/sandbox/shop/products/mba-15",
  },
  {
    id: "mbp-16",
    name: 'MacBook Pro 16"',
    price: "₩3,490,000",
    category: "laptop",
    url: "/sandbox/shop/products/mbp-16",
  },
  {
    id: "ipad-pro",
    name: 'iPad Pro 13"',
    price: "₩1,590,000",
    category: "tablet",
    url: "/sandbox/shop/products/ipad-pro",
  },
  {
    id: "iphone-16",
    name: "iPhone 16 Pro",
    price: "₩1,550,000",
    category: "phone",
    url: "/sandbox/shop/products/iphone-16",
  },
  {
    id: "airpods-max",
    name: "AirPods Max",
    price: "₩769,000",
    category: "audio",
    url: "/sandbox/shop/products/airpods-max",
  },
];

export function searchShopProducts(query: string, limit = 5): ShopProduct[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }
  return SHOP_PRODUCTS.filter((product) =>
    product.name.toLowerCase().includes(normalized) ||
    product.category.toLowerCase().includes(normalized),
  ).slice(0, limit);
}
