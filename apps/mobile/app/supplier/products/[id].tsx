import { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { supabase } from "../../../lib/supabase";
import { getProductImageUrl } from "../../../lib/product-image-url";

type Category = { id: string; name: string };
type Variant = {
  id: string;
  variant_name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
  sku: string | null;
};

const UNIT_TYPES = ["yard", "meter", "piece", "kg"];

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [newVariant, setNewVariant] = useState({
    variant_name: "",
    unit_type: "yard",
    price: "",
    stock_quantity: "",
    sku: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: allCategories } = await supabase
      .from("product_categories")
      .select("id, name")
      .order("name");
    setCategories(allCategories ?? []);

    const { data: product } = await supabase
      .from("products")
      .select("name, category_id, description, images")
      .eq("id", id)
      .single();

    if (product) {
      setName(product.name);
      setCategoryId(product.category_id);
      setDescription(product.description ?? "");
      setImages(product.images ?? []);
    }

    const { data: productVariants } = await supabase
      .from("product_variants")
      .select("id, variant_name, unit_type, price, stock_quantity, sku")
      .eq("product_id", id)
      .order("variant_name");
    setVariants(productVariants ?? []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveProduct() {
    setPending(true);
    setError(null);

    const { error } = await supabase
      .from("products")
      .update({ name, category_id: categoryId, description: description || null })
      .eq("id", id);

    if (error) {
      setError(error.message);
    }
    setPending(false);
  }

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    setError(null);

    const file = new File(asset.uri);
    const arrayBuffer = await file.arrayBuffer();
    const ext = asset.fileName?.split(".").pop() ?? "jpg";
    const path = `${id}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, arrayBuffer, {
        contentType: asset.mimeType ?? "image/jpeg",
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const nextImages = [...images, path];
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: nextImages })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setImages(nextImages);
    setUploading(false);
  }

  async function handleDeleteImage(path: string) {
    setUploading(true);
    setError(null);

    await supabase.storage.from("product-images").remove([path]);

    const nextImages = images.filter((p) => p !== path);
    const { error: updateError } = await supabase
      .from("products")
      .update({ images: nextImages })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setImages(nextImages);
    setUploading(false);
  }

  async function handleAddVariant() {
    setPending(true);
    setError(null);

    const { error } = await supabase.from("product_variants").insert({
      product_id: id,
      variant_name: newVariant.variant_name,
      unit_type: newVariant.unit_type,
      price: Number(newVariant.price),
      stock_quantity: Number(newVariant.stock_quantity || 0),
      sku: newVariant.sku || null,
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setNewVariant({
      variant_name: "",
      unit_type: "yard",
      price: "",
      stock_quantity: "",
      sku: "",
    });
    await load();
    setPending(false);
  }

  async function handleUpdateVariant(variant: Variant) {
    setPending(true);
    setError(null);

    const { error } = await supabase
      .from("product_variants")
      .update({
        variant_name: variant.variant_name,
        unit_type: variant.unit_type,
        price: variant.price,
        stock_quantity: variant.stock_quantity,
        sku: variant.sku || null,
      })
      .eq("id", variant.id);

    if (error) {
      setError(error.message);
    }
    setPending(false);
  }

  async function handleDeleteVariant(variantId: string) {
    setPending(true);
    setError(null);

    // Fails if the variant is referenced by existing order_items — that's
    // expected, order history keeps its FK to the variant it was bought at.
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    await load();
    setPending(false);
  }

  function updateVariantField(
    variantId: string,
    field: keyof Variant,
    value: string,
  ) {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === variantId
          ? {
              ...v,
              [field]:
                field === "price" || field === "stock_quantity"
                  ? Number(value)
                  : value,
            }
          : v,
      ),
    );
  }

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.push("/supplier/products")}>
        <Text style={styles.backLink}>← Back to products</Text>
      </Pressable>

      <Text style={styles.title}>Edit product</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
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

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSaveProduct}
        disabled={pending}
      >
        <Text style={styles.buttonText}>Save product</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Images</Text>

      {images.length > 0 && (
        <View style={styles.imageRow}>
          {images.map((path) => (
            <View key={path} style={styles.imageWrapper}>
              <Image
                source={{ uri: getProductImageUrl(path) }}
                style={styles.thumbnail}
              />
              <Pressable
                style={styles.imageDeleteButton}
                onPress={() => handleDeleteImage(path)}
                disabled={uploading}
              >
                <Text style={styles.imageDeleteButtonText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={[styles.smallButton, styles.addImageButton]}
        onPress={handlePickImage}
        disabled={uploading}
      >
        <Text style={styles.addImageButtonText}>
          {uploading ? "Uploading..." : "Add image"}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Variants</Text>

      {variants.length === 0 ? (
        <Text style={styles.meta}>
          No variants yet — customers can&apos;t buy this product until you
          add at least one.
        </Text>
      ) : (
        variants.map((variant) => (
          <View key={variant.id} style={styles.variantCard}>
            <TextInput
              style={styles.smallInput}
              placeholder="Variant name"
              value={variant.variant_name}
              onChangeText={(v) =>
                updateVariantField(variant.id, "variant_name", v)
              }
            />
            <View style={styles.unitRow}>
              {UNIT_TYPES.map((u) => (
                <Pressable
                  key={u}
                  style={[
                    styles.unitOption,
                    variant.unit_type === u && styles.unitOptionSelected,
                  ]}
                  onPress={() => updateVariantField(variant.id, "unit_type", u)}
                >
                  <Text style={styles.unitOptionText}>{u}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.rowGap}>
              <TextInput
                style={[styles.smallInput, styles.flexInput]}
                placeholder="Price"
                keyboardType="numeric"
                value={String(variant.price)}
                onChangeText={(v) => updateVariantField(variant.id, "price", v)}
              />
              <TextInput
                style={[styles.smallInput, styles.flexInput]}
                placeholder="Stock"
                keyboardType="numeric"
                value={String(variant.stock_quantity)}
                onChangeText={(v) =>
                  updateVariantField(variant.id, "stock_quantity", v)
                }
              />
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="SKU (optional)"
              value={variant.sku ?? ""}
              onChangeText={(v) => updateVariantField(variant.id, "sku", v)}
            />
            <View style={styles.rowGap}>
              <Pressable
                style={[styles.smallButton, styles.primaryButton, styles.flexButton]}
                onPress={() => handleUpdateVariant(variant)}
                disabled={pending}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
              <Pressable
                style={[styles.smallButton, styles.dangerButton]}
                onPress={() => handleDeleteVariant(variant.id)}
                disabled={pending}
              >
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <View style={styles.addVariantBox}>
        <Text style={styles.label}>Add a variant</Text>
        <TextInput
          style={styles.smallInput}
          placeholder="Variant name (e.g. White)"
          value={newVariant.variant_name}
          onChangeText={(v) =>
            setNewVariant((prev) => ({ ...prev, variant_name: v }))
          }
        />
        <View style={styles.unitRow}>
          {UNIT_TYPES.map((u) => (
            <Pressable
              key={u}
              style={[
                styles.unitOption,
                newVariant.unit_type === u && styles.unitOptionSelected,
              ]}
              onPress={() =>
                setNewVariant((prev) => ({ ...prev, unit_type: u }))
              }
            >
              <Text style={styles.unitOptionText}>{u}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.rowGap}>
          <TextInput
            style={[styles.smallInput, styles.flexInput]}
            placeholder="Price"
            keyboardType="numeric"
            value={newVariant.price}
            onChangeText={(v) => setNewVariant((prev) => ({ ...prev, price: v }))}
          />
          <TextInput
            style={[styles.smallInput, styles.flexInput]}
            placeholder="Stock"
            keyboardType="numeric"
            value={newVariant.stock_quantity}
            onChangeText={(v) =>
              setNewVariant((prev) => ({ ...prev, stock_quantity: v }))
            }
          />
        </View>
        <TextInput
          style={styles.smallInput}
          placeholder="SKU (optional)"
          value={newVariant.sku}
          onChangeText={(v) => setNewVariant((prev) => ({ ...prev, sku: v }))}
        />
        <Pressable
          style={[styles.button, pending && styles.buttonDisabled]}
          onPress={handleAddVariant}
          disabled={pending}
        >
          <Text style={styles.buttonText}>Add variant</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  backLink: {
    color: "#666",
    textDecorationLine: "underline",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    fontWeight: "600",
  },
  meta: {
    color: "#666",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryOptionSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5",
  },
  unitRow: {
    flexDirection: "row",
    gap: 6,
  },
  unitOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  unitOptionSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5",
  },
  unitOptionText: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowGap: {
    flexDirection: "row",
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  flexButton: {
    flex: 1,
  },
  smallInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
  },
  variantCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  addVariantBox: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  smallButton: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: {
    position: "relative",
  },
  thumbnail: {
    height: 80,
    width: 80,
    borderRadius: 8,
  },
  imageDeleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  imageDeleteButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  addImageButton: {
    alignSelf: "flex-start",
  },
  addImageButtonText: {
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  dangerButton: {
    borderColor: "#dc2626",
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
