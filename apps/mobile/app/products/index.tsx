import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getProductImageUrl } from "../../lib/product-image-url";

type Category = { id: string; name: string };
type ProductResult = {
  id: string;
  name: string;
  avg_rating: number;
  rating_count: number;
  images: string[];
  supplier_profiles: { business_name: string } | null;
  product_categories: { name: string } | null;
  product_variants: { price: number }[];
};

export default function ProductsScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("product_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("products")
        .select(
          "id, name, avg_rating, rating_count, images, supplier_profiles(business_name), product_categories(name), product_variants(price)",
        )
        .order("created_at", { ascending: false });

      if (name) query = query.ilike("name", `%${name}%`);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data } = await query;
      setResults((data as unknown as ProductResult[]) ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, categoryId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketplace</Text>

      <TextInput
        style={styles.input}
        placeholder="Search products"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.categoryRow}>
        <Pressable
          style={[styles.categoryOption, categoryId === "" && styles.categoryOptionSelected]}
          onPress={() => setCategoryId("")}
        >
          <Text>All</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[
              styles.categoryOption,
              categoryId === c.id && styles.categoryOptionSelected,
            ]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.meta}>No products found.</Text>}
          renderItem={({ item }) => {
            const prices = item.product_variants.map((v) => v.price);
            const priceRange =
              prices.length === 0
                ? "Out of stock"
                : Math.min(...prices) === Math.max(...prices)
                  ? `${Math.min(...prices)}`
                  : `${Math.min(...prices)} – ${Math.max(...prices)}`;

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/products/${item.id}`)}
              >
                {item.images.length > 0 && (
                  <Image
                    source={{ uri: getProductImageUrl(item.images[0]) }}
                    style={styles.thumbnail}
                  />
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.supplier_profiles?.business_name} ·{" "}
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
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoryOptionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
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
