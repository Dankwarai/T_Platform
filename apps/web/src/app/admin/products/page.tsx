"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getStorageImageUrl } from "@/lib/storage-image-url";

type ProductRow = {
  id: string;
  name: string;
  images: string[];
  supplier_profiles: { business_name: string } | null;
  product_categories: { name: string } | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, images, supplier_profiles(business_name), product_categories(name)",
      )
      .order("created_at", { ascending: false });
    setProducts((data as unknown as ProductRow[]) ?? []);
    setLoading(false);
  }

  async function deleteProduct(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (deleteError) {
      // Most likely cause: the product has real order history and the
      // product_variants -> order_items FK blocks the delete — surfacing
      // the DB error directly is clearer than a generic failure message.
      setError(deleteError.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
        Products
      </h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-slate-600 dark:text-slate-400">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No products yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                {product.images.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getStorageImageUrl(
                      "product-images",
                      product.images[0],
                    )}
                    alt=""
                    className="h-14 w-14 rounded-md object-cover"
                  />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 dark:text-slate-50">
                    {product.name}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {product.supplier_profiles?.business_name ??
                      "Unknown supplier"}{" "}
                    · {product.product_categories?.name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteProduct(product.id)}
                className="h-9 shrink-0 rounded-full border border-red-200 px-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
