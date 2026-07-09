import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductImageUrl } from "@/lib/product-image-url";
import { BuyForm } from "./buy-form";
import { ReviewForm } from "./review-form";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "id, name, description, images, avg_rating, rating_count, supplier_id, supplier_profiles(business_name, location), product_categories(name)",
    )
    .eq("id", id)
    .single();

  if (!product) {
    notFound();
  }

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, variant_name, unit_type, price, stock_quantity")
    .eq("product_id", id)
    .order("variant_name");

  const { data: reviews } = await supabase
    .from("product_reviews")
    .select("rating, comment, created_at")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const supplier = product.supplier_profiles as unknown as {
    business_name: string;
    location: string;
  } | null;
  const category = product.product_categories as unknown as {
    name: string;
  } | null;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/products"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Back to marketplace
        </Link>

        {product.images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto">
            {product.images.map((path: string) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={path}
                src={getProductImageUrl(path)}
                alt=""
                className="h-48 w-48 flex-shrink-0 rounded-md object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {product.name}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {category?.name} · Sold by{" "}
            <span className="font-medium">{supplier?.business_name}</span>
            {supplier?.location ? ` (${supplier.location})` : ""}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            {product.rating_count > 0
              ? `★ ${product.avg_rating.toFixed(1)} (${product.rating_count} review${product.rating_count === 1 ? "" : "s"})`
              : "No reviews yet"}
          </p>
          {product.description && (
            <p className="mt-2 text-black dark:text-zinc-50">
              {product.description}
            </p>
          )}
        </div>

        <BuyForm supplierId={product.supplier_id} variants={variants ?? []} />

        <ReviewForm productId={id} />

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">
            Reviews
          </h2>
          {!reviews || reviews.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">
              No reviews yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((review, i) => (
                <li
                  key={i}
                  className="rounded-md border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
                >
                  <p className="font-medium text-black dark:text-zinc-50">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  {review.comment && (
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                      {review.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
