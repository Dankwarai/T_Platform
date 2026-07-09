import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FollowButton } from "@/components/FollowButton";
import { getStorageImageUrl } from "@/lib/storage-image-url";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from("supplier_profiles")
    .select(
      "id, user_id, business_name, bio, location, follower_count, avatar_path",
    )
    .eq("id", id)
    .single();

  if (!supplier) {
    notFound();
  }

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, avg_rating, rating_count, product_categories(name), product_variants(price)",
    )
    .eq("supplier_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-6 py-10 dark:bg-slate-900">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/suppliers"
          className="text-sm text-slate-600 underline dark:text-slate-400"
        >
          ← Back to search
        </Link>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {supplier.avatar_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getStorageImageUrl("avatars", supplier.avatar_path)}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-50">
                {supplier.business_name}
              </h1>
            </div>
            <FollowButton followeeUserId={supplier.user_id} />
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {supplier.location} · {supplier.follower_count} follower
            {supplier.follower_count === 1 ? "" : "s"}
          </p>
          {supplier.bio && (
            <p className="mt-2 text-slate-800 dark:text-slate-50">
              {supplier.bio}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-slate-800 dark:text-slate-50">
            Products
          </h2>
          {!products || products.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">
              No products listed yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {products.map((product) => {
                const prices = (
                  product.product_variants as unknown as { price: number }[]
                ).map((v) => v.price);
                const category = product.product_categories as unknown as {
                  name: string;
                } | null;
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
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-50">
                          {product.name}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {category?.name} · {priceRange}
                        </span>
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
    </div>
  );
}
