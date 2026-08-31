"use client";

import { useCallback, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";

type ShopProduct = {
  id: string;
  name: string;
  price: string;
  url: string;
};

export function RimvioShopSandboxClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setSearched(true);
    setProducts([]);
    try {
      const params = new URLSearchParams({ query: searchQuery, limit: "10" });
      const res = await fetch(`/api/sandbox/shop/products?${params.toString()}`);
      const data = (await res.json()) as { products: ShopProduct[] };
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0071e3] text-[12px] font-bold text-white">
            R
          </div>
          <span className="text-[15px] font-semibold">Rimvio Shop</span>
        </div>
        <ShoppingBag className="h-4 w-4 text-[#86868b]" />
      </header>

      <section className="border-b bg-gradient-to-b from-[#f5faff] to-white px-5 py-6" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em]">제품 검색</h1>
        <p className="mt-1 text-[13px] text-[#86868b]">Sandbox · Playwright target · product.search</p>

        <form
          className="mt-5 flex gap-2 rounded-[16px] border bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
          style={{ borderColor: "rgba(0,0,0,0.06)" }}
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch(query);
          }}
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-[#86868b]">검색어</span>
            <input
              data-testid="product-query-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="MacBook"
              className="w-full rounded-[10px] border bg-[#fbfbfd] px-3 py-2 text-[13px] outline-none ring-[#0071e3]/30 focus:ring-2"
              style={{ borderColor: "rgba(0,0,0,0.08)" }}
            />
          </label>
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              data-testid="product-search-button"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#0071e3] px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Search className="h-4 w-4" />
              검색
            </button>
          </div>
        </form>
      </section>

      <section className="px-5 py-6" data-testid="product-results">
        {loading ? (
          <p className="text-[13px] text-[#86868b]">검색 중…</p>
        ) : null}
        {!loading && searched && products.length === 0 ? (
          <p className="text-[13px] text-[#86868b]">검색 결과가 없습니다.</p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.id}
              data-testid="product-card"
              className="rounded-[14px] border bg-white p-4 shadow-sm"
              style={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              <h2 data-testid="product-name" className="text-[15px] font-semibold">
                {product.name}
              </h2>
              <p data-testid="product-price" className="mt-1 text-[14px] text-[#0071e3]">
                {product.price}
              </p>
              <a
                data-testid="product-link"
                href={product.url}
                className="mt-3 inline-block text-[12px] font-medium text-[#636366] underline"
              >
                상세 보기
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
