"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({ followeeUserId }: { followeeUserId: string }) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id === followeeUserId) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("followee_id", followeeUserId)
        .maybeSingle();

      setIsFollowing(!!data);
      setLoading(false);
    })();
  }, [followeeUserId]);

  async function toggleFollow() {
    if (!currentUserId) return;
    setPending(true);
    const supabase = createClient();

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("followee_id", followeeUserId);
      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, followee_id: followeeUserId });
      if (!error) setIsFollowing(true);
    }

    setPending(false);
    router.refresh();
  }

  if (loading || !currentUserId) {
    return null;
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={pending}
      className={
        isFollowing
          ? "h-10 rounded-full border border-solid border-slate-200 px-5 text-sm transition-colors hover:border-transparent hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          : "h-10 rounded-full bg-accent px-5 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      }
    >
      {pending ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
