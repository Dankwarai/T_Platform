"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "customer") {
        setLoading(false);
        return;
      }

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data: existingReview } = await supabase
        .from("product_reviews")
        .select("id, rating, comment")
        .eq("customer_id", customerProfile.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingReview) {
        setReviewId(existingReview.id);
        setRating(existingReview.rating);
        setComment(existingReview.comment ?? "");
      }

      setVisible(true);
      setLoading(false);
    })();
  }, [productId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setPending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      return;
    }

    const { data: customerProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!customerProfile) {
      setPending(false);
      return;
    }

    // No `id` in the payload — the unique constraint on
    // (customer_id, product_id) is the conflict target, so Postgres assigns
    // a fresh id on insert and leaves the existing id untouched on update.
    // RLS requires a completed order containing this product; if the buyer
    // hasn't bought it, this fails with a row-level security error.
    const { error: upsertError } = await supabase.from("product_reviews").upsert(
      {
        customer_id: customerProfile.id,
        product_id: productId,
        rating,
        comment: comment || null,
      },
      { onConflict: "customer_id,product_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!reviewId) return;
    setPending(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", reviewId);

    if (deleteError) {
      setError(deleteError.message);
      setPending(false);
      return;
    }

    setReviewId(null);
    setRating(0);
    setComment("");
    setPending(false);
    router.refresh();
  }

  if (loading || !visible) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
    >
      <h3 className="font-medium text-black dark:text-zinc-50">
        {reviewId ? "Edit your review" : "Leave a review"}
      </h3>

      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="leading-none"
          >
            {star <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment (optional)"
        rows={3}
        className="rounded-md border border-black/[.08] bg-white px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 flex-1 rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {pending ? "Saving..." : reviewId ? "Update review" : "Submit review"}
        </button>
        {reviewId && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="h-10 rounded-full border border-solid border-red-600 px-4 text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
