"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TailorReview = {
  id: string;
  rating: number;
  comment: string | null;
  tailor_profiles: { business_name: string } | null;
  customer_profiles: { users: { full_name: string } | null } | null;
};

type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  products: { name: string } | null;
  customer_profiles: { users: { full_name: string } | null } | null;
};

export default function AdminReviewsPage() {
  const [tailorReviews, setTailorReviews] = useState<TailorReview[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const [{ data: tr }, { data: pr }] = await Promise.all([
      supabase
        .from("reviews")
        .select(
          "id, rating, comment, tailor_profiles(business_name), customer_profiles(users(full_name))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("product_reviews")
        .select(
          "id, rating, comment, products(name), customer_profiles(users(full_name))",
        )
        .order("created_at", { ascending: false }),
    ]);
    setTailorReviews((tr as unknown as TailorReview[]) ?? []);
    setProductReviews((pr as unknown as ProductReview[]) ?? []);
    setLoading(false);
  }

  async function deleteTailorReview(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTailorReviews((prev) => prev.filter((r) => r.id !== id));
  }

  async function deleteProductReview(id: string) {
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProductReviews((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <p className="text-slate-600 dark:text-slate-400">Loading...</p>;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
        Reviews
      </h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
          Tailor reviews
        </h2>
        {tailorReviews.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            None yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tailorReviews.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 dark:text-slate-50">
                    ★ {r.rating} ·{" "}
                    {r.tailor_profiles?.business_name ?? "Unknown tailor"}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {r.customer_profiles?.users?.full_name ??
                      "Unknown customer"}
                    {r.comment ? ` — "${r.comment}"` : ""}
                  </span>
                </div>
                <button
                  onClick={() => deleteTailorReview(r.id)}
                  className="h-9 shrink-0 rounded-full border border-red-200 px-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
          Product reviews
        </h2>
        {productReviews.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            None yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {productReviews.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-slate-800 dark:text-slate-50">
                    ★ {r.rating} · {r.products?.name ?? "Unknown product"}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {r.customer_profiles?.users?.full_name ??
                      "Unknown customer"}
                    {r.comment ? ` — "${r.comment}"` : ""}
                  </span>
                </div>
                <button
                  onClick={() => deleteProductReview(r.id)}
                  className="h-9 shrink-0 rounded-full border border-red-200 px-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
