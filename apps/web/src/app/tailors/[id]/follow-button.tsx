"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({ tailorUserId }: { tailorUserId: string }) {
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
      if (!user || user.id === tailorUserId) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("followee_id", tailorUserId)
        .maybeSingle();

      setIsFollowing(!!data);
      setLoading(false);
    })();
  }, [tailorUserId]);

  async function toggleFollow() {
    if (!currentUserId) return;
    setPending(true);
    const supabase = createClient();

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("followee_id", tailorUserId);
      if (!error) setIsFollowing(false);
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, followee_id: tailorUserId });
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
          ? "h-10 rounded-full border border-solid border-black/[.08] px-5 text-sm transition-colors hover:border-transparent hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          : "h-10 rounded-full bg-foreground px-5 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      }
    >
      {pending ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
