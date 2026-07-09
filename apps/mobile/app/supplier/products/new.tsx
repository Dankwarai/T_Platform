import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../contexts/auth-context";
import { supabase } from "../../../lib/supabase";

type Category = { id: string; name: string };

export default function NewProductScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
      setSupplierId(supplierProfile.id);

      const { data: allCategories } = await supabase
        .from("product_categories")
        .select("id, name")
        .order("name");
      setCategories(allCategories ?? []);
      if (allCategories && allCategories.length > 0) {
        setCategoryId(allCategories[0].id);
      }

      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit() {
    if (!supplierId) return;
    setPending(true);
    setError(null);

    const { data, error } = await supabase
      .from("products")
      .insert({
        supplier_id: supplierId,
        category_id: categoryId,
        name,
        description: description || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setError(error?.message ?? "Failed to create product.");
      setPending(false);
      return;
    }

    router.replace(`/supplier/products/${data.id}`);
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
      <Text style={styles.title}>Add a product</Text>

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

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Creating..." : "Create and add variants"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  label: {
    fontWeight: "600",
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
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryOptionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
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
