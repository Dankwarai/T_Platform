import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type GarmentType = { id: string; name: string; description: string | null };
type ProductCategory = { id: string; name: string };

export default function AdminSettingsScreen() {
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionPending, setCommissionPending] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSaved, setCommissionSaved] = useState(false);

  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [newGarmentName, setNewGarmentName] = useState("");
  const [newGarmentDescription, setNewGarmentDescription] = useState("");
  const [garmentError, setGarmentError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: settings }, { data: gt }, { data: cats }] =
      await Promise.all([
        supabase
          .from("platform_settings")
          .select("commission_rate")
          .eq("id", true)
          .single(),
        supabase
          .from("garment_types")
          .select("id, name, description")
          .order("name"),
        supabase.from("product_categories").select("id, name").order("name"),
      ]);
    if (settings) {
      setCommissionRate((settings.commission_rate * 100).toString());
    }
    setGarmentTypes(gt ?? []);
    setCategories(cats ?? []);
    setLoading(false);
  }

  async function saveCommissionRate() {
    setCommissionPending(true);
    setCommissionError(null);
    setCommissionSaved(false);

    const rateFraction = Number(commissionRate) / 100;
    if (Number.isNaN(rateFraction) || rateFraction < 0 || rateFraction > 1) {
      setCommissionError("Enter a percentage between 0 and 100.");
      setCommissionPending(false);
      return;
    }

    const { error } = await supabase
      .from("platform_settings")
      .update({ commission_rate: rateFraction })
      .eq("id", true);

    if (error) {
      setCommissionError(error.message);
      setCommissionPending(false);
      return;
    }

    setCommissionPending(false);
    setCommissionSaved(true);
  }

  async function addGarmentType() {
    setGarmentError(null);
    if (!newGarmentName.trim()) return;

    const { data, error } = await supabase
      .from("garment_types")
      .insert({
        name: newGarmentName.trim(),
        description: newGarmentDescription.trim() || null,
      })
      .select("id, name, description")
      .single();

    if (error || !data) {
      setGarmentError(error?.message ?? "Failed to add garment type.");
      return;
    }

    setGarmentTypes((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewGarmentName("");
    setNewGarmentDescription("");
  }

  async function deleteGarmentType(id: string) {
    setGarmentError(null);
    const { error } = await supabase
      .from("garment_types")
      .delete()
      .eq("id", id);
    if (error) {
      setGarmentError(error.message);
      return;
    }
    setGarmentTypes((prev) => prev.filter((gt) => gt.id !== id));
  }

  async function addCategory() {
    setCategoryError(null);
    if (!newCategoryName.trim()) return;

    const { data, error } = await supabase
      .from("product_categories")
      .insert({ name: newCategoryName.trim() })
      .select("id, name")
      .single();

    if (error || !data) {
      setCategoryError(error?.message ?? "Failed to add category.");
      return;
    }

    setCategories((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNewCategoryName("");
  }

  async function deleteCategory(id: string) {
    setCategoryError(null);
    const { error } = await supabase
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) {
      setCategoryError(error.message);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
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
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Marketplace commission</Text>
        <Text style={styles.meta}>
          Applies to new orders only — orders already placed keep the rate
          that was in effect when they were created.
        </Text>
        <Text style={styles.label}>Commission rate (%)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={commissionRate}
          onChangeText={setCommissionRate}
        />
        {commissionError && (
          <Text style={styles.error}>{commissionError}</Text>
        )}
        {commissionSaved && <Text style={styles.saved}>Saved.</Text>}
        <Pressable
          style={[styles.button, commissionPending && styles.buttonDisabled]}
          onPress={saveCommissionRate}
          disabled={commissionPending}
        >
          <Text style={styles.buttonText}>
            {commissionPending ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Garment types</Text>
        {garmentError && <Text style={styles.error}>{garmentError}</Text>}
        {garmentTypes.map((gt) => (
          <View key={gt.id} style={styles.row}>
            <Text style={styles.rowText}>
              {gt.name}
              {gt.description ? ` — ${gt.description}` : ""}
            </Text>
            <Pressable onPress={() => deleteGarmentType(gt.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={newGarmentName}
          onChangeText={setNewGarmentName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={newGarmentDescription}
          onChangeText={setNewGarmentDescription}
        />
        <Pressable style={styles.button} onPress={addGarmentType}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product categories</Text>
        {categoryError && <Text style={styles.error}>{categoryError}</Text>}
        {categories.map((c) => (
          <View key={c.id} style={styles.row}>
            <Text style={styles.rowText}>{c.name}</Text>
            <Pressable onPress={() => deleteCategory(c.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))}
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />
        <Pressable style={styles.button} onPress={addCategory}>
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  section: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    fontSize: 13,
  },
  deleteText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  meta: {
    color: "#475569",
    fontSize: 13,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
  },
  saved: {
    color: "#16a34a",
    fontSize: 13,
  },
});
