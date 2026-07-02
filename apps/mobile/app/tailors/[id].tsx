import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";

type Tailor = {
  id: string;
  business_name: string;
  bio: string | null;
  location: string;
  years_experience: number | null;
  avg_rating: number;
  rating_count: number;
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

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase
        .from("tailor_profiles")
        .select(
          "id, business_name, bio, location, years_experience, avg_rating, rating_count",
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{tailor.business_name}</Text>
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
      </Text>
      {tailor.bio && <Text style={styles.bio}>{tailor.bio}</Text>}

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
