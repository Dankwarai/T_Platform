import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BuyForm } from "../../components/BuyForm";
import { ProductReviewForm } from "../../components/ProductReviewForm";
import { supabase } from "../../lib/supabase";
import { getProductImageUrl } from "../../lib/product-image-url";

type Product = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  avg_rating: number;
  rating_count: number;
  supplier_id: string;
  supplier_profiles: { business_name: string; location: string } | null;
  product_categories: { name: string } | null;
};

type Variant = {
  id: string;
  variant_name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    if (!id) return;

    Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, images, avg_rating, rating_count, supplier_id, supplier_profiles(business_name, location), product_categories(name)",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("product_variants")
        .select("id, variant_name, unit_type, price, stock_quantity")
        .eq("product_id", id)
        .order("variant_name"),
      supabase
        .from("product_reviews")
        .select("rating, comment, created_at")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]).then(([productRes, variantsRes, reviewsRes]) => {
      setProduct(productRes.data as unknown as Product);
      setVariants(variantsRes.data ?? []);
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

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Product not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {product.images.length > 0 && (
        <ScrollView horizontal style={styles.imageScroll}>
          {product.images.map((path) => (
            <Image
              key={path}
              source={{ uri: getProductImageUrl(path) }}
              style={styles.heroImage}
            />
          ))}
        </ScrollView>
      )}
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.meta}>
        {product.product_categories?.name} · Sold by{" "}
        <Text style={styles.bold}>
          {product.supplier_profiles?.business_name}
        </Text>
        {product.supplier_profiles?.location
          ? ` (${product.supplier_profiles.location})`
          : ""}
      </Text>
      <Text style={styles.meta}>
        {product.rating_count > 0
          ? `★ ${product.avg_rating.toFixed(1)} (${product.rating_count} review${product.rating_count === 1 ? "" : "s"})`
          : "No reviews yet"}
      </Text>
      {product.description && (
        <Text style={styles.bio}>{product.description}</Text>
      )}

      <View style={styles.formWrapper}>
        <BuyForm
          supplierId={product.supplier_id}
          variants={variants}
          onChange={loadData}
        />
      </View>

      <View style={styles.formWrapper}>
        <ProductReviewForm productId={product.id} onChange={loadData} />
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
            {review.comment && <Text style={styles.meta}>{review.comment}</Text>}
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
  bold: {
    fontWeight: "600",
    color: "#000",
  },
  bio: {
    marginTop: 8,
  },
  imageScroll: {
    flexGrow: 0,
  },
  heroImage: {
    height: 192,
    width: 192,
    borderRadius: 8,
    marginRight: 12,
  },
  formWrapper: {
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
