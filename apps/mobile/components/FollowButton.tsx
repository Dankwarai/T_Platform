import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { supabase } from "../lib/supabase";

export function FollowButton({
  followeeUserId,
  onChange,
}: {
  followeeUserId: string;
  onChange: () => void;
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
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
    onChange();
  }

  if (loading || !currentUserId) {
    return null;
  }

  return (
    <Pressable
      style={[styles.button, isFollowing && styles.followingButton]}
      onPress={toggleFollow}
      disabled={pending}
    >
      <Text style={isFollowing ? styles.followingText : styles.followText}>
        {pending ? "..." : isFollowing ? "Following" : "Follow"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  followText: {
    color: "#fff",
    fontWeight: "600",
  },
  followingText: {
    color: "#0f172a",
    fontWeight: "600",
  },
});
