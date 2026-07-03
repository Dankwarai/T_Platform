import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FollowButton } from "../../components/FollowButton";
import { ReviewForm } from "../../components/ReviewForm";
import { supabase } from "../../lib/supabase";

type Tailor = {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  location: string;
  years_experience: number | null;
  avg_rating: number;
  rating_count: number;
  follower_count: number;
  // Left loosely typed — without generated DB types, PostgREST's embedded
  // resource shape (one-to-one vs one-to-many) can't be inferred precisely.
  tailor_specialties: unknown;
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function TailorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tailor, setTailor] = useState<Tailor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;

    Promise.all([
      supabase
        .from("tailor_profiles")
        .select(
          "id, user_id, business_name, bio, location, years_experience, avg_rating, rating_count, follower_count, tailor_specialties(garment_types(name))",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("reviews")
        .select("rating, comment, created_at")
        .eq("tailor_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(([tailorRes, reviewsRes]) => {
      setTailor(tailorRes.data);
      setReviews(reviewsRes.data ?? []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!tailor) {
    return (
      <View style={styles.container}>
        <Text>Tailor not found.</Text>
      </View>
    );
  }

  const specialtyNames = (
    (tailor.tailor_specialties as { garment_types: unknown }[] | null) ?? []
  )
    .map((s) => {
      const gt = s.garment_types;
      const name = Array.isArray(gt) ? gt[0]?.name : (gt as { name?: string } | null)?.name;
      return name as string | undefined;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{tailor.business_name}</Text>
        <FollowButton tailorUserId={tailor.user_id} onChange={loadData} />
      </View>
      <Text style={styles.meta}>
        {tailor.location}
        {tailor.years_experience
          ? ` · ${tailor.years_experience} yrs experience`
          : ""}
      </Text>
      <Text style={styles.meta}>
        {tailor.rating_count > 0
          ? `★ ${tailor.avg_rating.toFixed(1)} (${tailor.rating_count} review${tailor.rating_count === 1 ? "" : "s"})`
          : "No reviews yet"}
        {" · "}
        {tailor.follower_count} follower{tailor.follower_count === 1 ? "" : "s"}
      </Text>
      {specialtyNames.length > 0 && (
        <Text style={styles.meta}>
          Specialties: {specialtyNames.join(", ")}
        </Text>
      )}
      {tailor.bio && <Text style={styles.bio}>{tailor.bio}</Text>}

      <View style={styles.reviewFormWrapper}>
        <ReviewForm tailorId={tailor.id} onChange={loadData} />
      </View>

      <Text style={styles.sectionTitle}>Reviews</Text>
      {reviews.length === 0 ? (
        <Text style={styles.meta}>No reviews yet.</Text>
      ) : (
        reviews.map((review, i) => (
          <View key={i} style={styles.reviewCard}>
            <Text style={styles.stars}>
              {"★".repeat(review.rating)}
              {"☆".repeat(5 - review.rating)}
            </Text>
            {review.comment && (
              <Text style={styles.meta}>{review.comment}</Text>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 8,
    backgroundColor: "#fff",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  meta: {
    color: "#666",
  },
  bio: {
    marginTop: 8,
  },
  reviewFormWrapper: {
    marginTop: 12,
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  stars: {
    fontWeight: "600",
  },
});
