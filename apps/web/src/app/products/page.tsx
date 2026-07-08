"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Category = { id: string; name: string };
type ProductResult = {
  id: string;
  name: string;
  avg_rating: number;
  rating_count: number;
  supplier_profiles: { business_name: string } | null;
  product_categories: { name: string } | null;
  product_variants: { price: number }[];
};

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("product_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("products")
        .select(
          "id, name, avg_rating, rating_count, supplier_profiles(business_name), product_categories(name), product_variants(price)",
        )
        .order("created_at", { ascending: false });

      if (name) query = query.ilike("name", `%${name}%`);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data } = await query;
      setResults((data as unknown as ProductResult[]) ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, categoryId]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Marketplace
        </h1>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search products"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No products found.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {results.map((product) => {
              const prices = product.product_variants.map((v) => v.price);
              const priceRange =
                prices.length === 0
                  ? "Out of stock"
                  : Math.min(...prices) === Math.max(...prices)
                    ? `${Math.min(...prices)}`
                    : `${Math.min(...prices)} – ${Math.max(...prices)}`;

              return (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between rounded-md border border-black/[.08] bg-white p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:bg-black dark:hover:bg-white/[.03]"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-black dark:text-zinc-50">
                        {product.name}
                      </span>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {product.supplier_profiles?.business_name} ·{" "}
                        {product.product_categories?.name} · {priceRange}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {product.rating_count > 0
                        ? `★ ${product.avg_rating.toFixed(1)} (${product.rating_count})`
                        : "No reviews yet"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
