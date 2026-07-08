import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";
import { RequestJobForm } from "./request-job-form";
import { SkillBadge } from "@/components/SkillBadge";
import { FollowButton } from "@/components/FollowButton";

export default async function TailorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tailor } = await supabase
    .from("tailor_profiles")
    .select(
      "id, user_id, business_name, bio, location, years_experience, avg_rating, rating_count, follower_count, skill_score, skill_tier, tailor_specialties(garment_types(name))",
    )
    .eq("id", id)
    .single();

  if (!tailor) {
    notFound();
  }

  const specialtyNames = (
    (tailor.tailor_specialties as unknown as {
      garment_types: { name: string } | null;
    }[]) ?? []
  )
    .map((s) => s.garment_types?.name)
    .filter(Boolean);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("tailor_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <Link
          href="/tailors"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Back to search
        </Link>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              {tailor.business_name}
            </h1>
            <div className="flex items-center gap-2">
              <SkillBadge tier={tailor.skill_tier} />
              <FollowButton followeeUserId={tailor.user_id} />
            </div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            {tailor.location}
            {tailor.years_experience
              ? ` · ${tailor.years_experience} yrs experience`
              : ""}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            {tailor.rating_count > 0
              ? `★ ${tailor.avg_rating.toFixed(1)} (${tailor.rating_count} review${tailor.rating_count === 1 ? "" : "s"})`
              : "No reviews yet"}
            {" · "}
            {tailor.follower_count} follower
            {tailor.follower_count === 1 ? "" : "s"}
          </p>
          {specialtyNames.length > 0 && (
            <p className="text-sm text-zinc-500">
              Specialties: {specialtyNames.join(", ")}
            </p>
          )}
          {tailor.bio && (
            <p className="mt-2 text-black dark:text-zinc-50">{tailor.bio}</p>
          )}
        </div>

        <RequestJobForm tailorId={id} />

        <ReviewForm tailorId={id} />

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
