import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../contexts/auth-context";
import { supabase } from "../../../lib/supabase";
import { getStorageImageUrl } from "../../../lib/storage-image-url";

type ProductRow = {
  id: string;
  name: string;
  avg_rating: number;
  rating_count: number;
  images: string[];
  product_categories: { name: string } | null;
  product_variants: { price: number }[];
};

export default function SupplierProductsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: supplierProfile } = await supabase
        .from("supplier_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!supplierProfile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select(
          "id, name, avg_rating, rating_count, images, product_categories(name), product_variants(price)",
        )
        .eq("supplier_id", supplierProfile.id)
        .order("created_at", { ascending: false });

      setProducts((data as unknown as ProductRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My products</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push("/supplier/products/new")}
        >
          <Text style={styles.addButtonText}>Add product</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.meta}>No products yet — add your first one.</Text>
          }
          renderItem={({ item }) => {
            const prices = item.product_variants.map((v) => v.price);
            const priceRange =
              prices.length === 0
                ? "No variants yet"
                : Math.min(...prices) === Math.max(...prices)
                  ? `${Math.min(...prices)}`
                  : `${Math.min(...prices)} – ${Math.max(...prices)}`;

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/supplier/products/${item.id}`)}
              >
                {item.images.length > 0 && (
                  <Image
                    source={{ uri: getStorageImageUrl("product-images", item.images[0]) }}
                    style={styles.thumbnail}
                  />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.product_categories?.name} · {priceRange}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {item.rating_count > 0
                    ? `★ ${item.avg_rating.toFixed(1)} (${item.rating_count})`
                    : "No reviews yet"}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
  thumbnail: {
    height: 48,
    width: 48,
    borderRadius: 6,
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
});
