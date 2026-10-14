import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../lib/supabase";

type TailorReview = {
  id: string;
  rating: number;
  comment: string | null;
  tailor_profiles: { business_name: string } | null;
  customer_profiles: { users: { full_name: string } | null } | null;
};

type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  products: { name: string } | null;
  customer_profiles: { users: { full_name: string } | null } | null;
};

export default function AdminReviewsScreen() {
  const [tailorReviews, setTailorReviews] = useState<TailorReview[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: tr }, { data: pr }] = await Promise.all([
      supabase
        .from("reviews")
        .select(
          "id, rating, comment, tailor_profiles(business_name), customer_profiles(users(full_name))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("product_reviews")
        .select(
          "id, rating, comment, products(name), customer_profiles(users(full_name))",
        )
        .order("created_at", { ascending: false }),
    ]);
    setTailorReviews((tr as unknown as TailorReview[]) ?? []);
    setProductReviews((pr as unknown as ProductReview[]) ?? []);
    setLoading(false);
  }

  async function deleteTailorReview(id: string) {
    setError(null);
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTailorReviews((prev) => prev.filter((r) => r.id !== id));
  }

  async function deleteProductReview(id: string) {
    setError(null);
    const { error: deleteError } = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProductReviews((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reviews</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Tailor reviews</Text>
      {tailorReviews.length === 0 ? (
        <Text style={styles.meta}>None yet.</Text>
      ) : (
        tailorReviews.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                ★ {r.rating} ·{" "}
                {r.tailor_profiles?.business_name ?? "Unknown tailor"}
              </Text>
              <Text style={styles.meta}>
                {r.customer_profiles?.users?.full_name ?? "Unknown customer"}
                {r.comment ? ` — "${r.comment}"` : ""}
              </Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteTailorReview(r.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Product reviews</Text>
      {productReviews.length === 0 ? (
        <Text style={styles.meta}>None yet.</Text>
      ) : (
        productReviews.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>
                ★ {r.rating} · {r.products?.name ?? "Unknown product"}
              </Text>
              <Text style={styles.meta}>
                {r.customer_profiles?.users?.full_name ?? "Unknown customer"}
                {r.comment ? ` — "${r.comment}"` : ""}
              </Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteProductReview(r.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
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
    gap: 10,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "600",
  },
  meta: {
    color: "#475569",
    fontSize: 13,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteButtonText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
