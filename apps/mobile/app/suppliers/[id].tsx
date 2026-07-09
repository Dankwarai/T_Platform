import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FollowButton } from "../../components/FollowButton";
import { supabase } from "../../lib/supabase";

type Supplier = {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  location: string;
  follower_count: number;
};

type Product = {
  id: string;
  name: string;
  avg_rating: number;
  rating_count: number;
  product_categories: { name: string } | null;
  product_variants: { price: number }[];
};

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;

    Promise.all([
      supabase
        .from("supplier_profiles")
        .select("id, user_id, business_name, bio, location, follower_count")
        .eq("id", id)
        .single(),
      supabase
        .from("products")
        .select(
          "id, name, avg_rating, rating_count, product_categories(name), product_variants(price)",
        )
        .eq("supplier_id", id)
        .order("created_at", { ascending: false }),
    ]).then(([supplierRes, productsRes]) => {
      setSupplier(supplierRes.data);
      setProducts((productsRes.data as unknown as Product[]) ?? []);
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

  if (!supplier) {
    return (
      <View style={styles.container}>
        <Text>Supplier not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{supplier.business_name}</Text>
        <FollowButton followeeUserId={supplier.user_id} onChange={loadData} />
      </View>
      <Text style={styles.meta}>
        {supplier.location} · {supplier.follower_count} follower
        {supplier.follower_count === 1 ? "" : "s"}
      </Text>
      {supplier.bio && <Text style={styles.bio}>{supplier.bio}</Text>}

      <Text style={styles.sectionTitle}>Products</Text>
      {products.length === 0 ? (
        <Text style={styles.meta}>No products listed yet.</Text>
      ) : (
        products.map((product) => {
          const prices = product.product_variants.map((v) => v.price);
          const priceRange =
            prices.length === 0
              ? "Out of stock"
              : Math.min(...prices) === Math.max(...prices)
                ? `${Math.min(...prices)}`
                : `${Math.min(...prices)} – ${Math.max(...prices)}`;

          return (
            <Pressable
              key={product.id}
              style={styles.card}
              onPress={() => router.push(`/products/${product.id}`)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{product.name}</Text>
                <Text style={styles.meta}>
                  {product.product_categories?.name} · {priceRange}
                </Text>
              </View>
              <Text style={styles.meta}>
                {product.rating_count > 0
                  ? `★ ${product.avg_rating.toFixed(1)} (${product.rating_count})`
                  : "No reviews yet"}
              </Text>
            </Pressable>
          );
        })
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
    color: "#475569",
  },
  bio: {
    marginTop: 8,
  },
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});
