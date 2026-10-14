import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { getStorageImageUrl } from "../../lib/storage-image-url";

type ProductRow = {
  id: string;
  name: string;
  images: string[];
  supplier_profiles: { business_name: string } | null;
  product_categories: { name: string } | null;
};

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("products")
      .select(
        "id, name, images, supplier_profiles(business_name), product_categories(name)",
      )
      .order("created_at", { ascending: false });
    setProducts((data as unknown as ProductRow[]) ?? []);
    setLoading(false);
  }

  async function deleteProduct(id: string) {
    setError(null);
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (deleteError) {
      // Most likely cause: real order history via product_variants ->
      // order_items blocks the delete at the FK level — surface the DB
      // error directly rather than a generic failure message.
      setError(deleteError.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.meta}>No products yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.images.length > 0 && (
                <Image
                  source={{
                    uri: getStorageImageUrl("product-images", item.images[0]),
                  }}
                  style={styles.thumbnail}
                />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.supplier_profiles?.business_name ??
                    "Unknown supplier"}{" "}
                  · {item.product_categories?.name}
                </Text>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteProduct(item.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          )}
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
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
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
