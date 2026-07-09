"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getProductImageUrl } from "@/lib/product-image-url";

type ProductRow = {
  id: string;
  name: string;
  avg_rating: number;
  rating_count: number;
  images: string[];
  product_categories: { name: string } | null;
  product_variants: { price: number }[];
};

export default function SupplierProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: supplierProfile } = await supabase
        .from("supplier_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!supplierProfile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select(
          "id, name, avg_rating, rating_count, images, product_categories(name), product_variants(price)",
        )
        .eq("supplier_id", supplierProfile.id)
        .order("created_at", { ascending: false });

      setProducts((data as unknown as ProductRow[]) ?? []);
      setLoading(false);
    })();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
            My products
          </h1>
          <Link
            href="/supplier/products/new"
            className="h-10 rounded-full bg-accent px-4 text-sm leading-10 text-white transition-colors hover:bg-accent-hover"
          >
            Add product
          </Link>
        </div>

        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No products yet — add your first one.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.map((product) => {
              const prices = product.product_variants.map((v) => v.price);
              const priceRange =
                prices.length === 0
                  ? "No variants yet"
                  : Math.min(...prices) === Math.max(...prices)
                    ? `${Math.min(...prices)}`
                    : `${Math.min(...prices)} – ${Math.max(...prices)}`;

              return (
                <li key={product.id}>
                  <Link
                    href={`/supplier/products/${product.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-3">
                      {product.images.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getProductImageUrl(product.images[0])}
                          alt=""
                          className="h-14 w-14 rounded-md object-cover"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-50">
                          {product.name}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {product.product_categories?.name} · {priceRange}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500">
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
