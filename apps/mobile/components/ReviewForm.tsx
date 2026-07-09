import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export function ReviewForm({
  tailorId,
  onChange,
}: {
  tailorId: string;
  onChange: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        .from("reviews")
        .select("id, rating, comment")
        .eq("customer_id", customerProfile.id)
        .eq("tailor_id", tailorId)
        .maybeSingle();

      if (existingReview) {
        setReviewId(existingReview.id);
        setRating(existingReview.rating);
        setComment(existingReview.comment ?? "");
      }

      setVisible(true);
      setLoading(false);
    })();
  }, [tailorId]);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setPending(true);
    setError(null);

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

    const { error: upsertError } = await supabase.from("reviews").upsert(
      {
        customer_id: customerProfile.id,
        tailor_id: tailorId,
        rating,
        comment: comment || null,
      },
      { onConflict: "customer_id,tailor_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setPending(false);
      return;
    }

    setPending(false);
    onChange();
  }

  async function handleDelete() {
    if (!reviewId) return;
    setPending(true);
    const { error: deleteError } = await supabase
      .from("reviews")
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
    onChange();
  }

  if (loading || !visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {reviewId ? "Edit your review" : "Leave a review"}
      </Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)}>
            <Text style={styles.star}>{star <= rating ? "★" : "☆"}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={pending}
        >
          <Text style={styles.submitButtonText}>
            {pending ? "Saving..." : reviewId ? "Update review" : "Submit review"}
          </Text>
        </Pressable>
        {reviewId && (
          <Pressable
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={pending}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  title: {
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  star: {
    fontSize: 28,
    lineHeight: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    minHeight: 70,
    textAlignVertical: "top",
  },
  error: {
    color: "#dc2626",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#4f46e5",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  deleteButtonText: {
    color: "#dc2626",
    fontWeight: "600",
  },
});
