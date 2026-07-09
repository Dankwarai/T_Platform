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
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";

type GarmentType = { id: string; name: string };

export default function TailorServicePricesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tailorId, setTailorId] = useState<string | null>(null);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "tailor") {
        router.replace("/home");
        return;
      }

      const { data: tailorProfile } = await supabase
        .from("tailor_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!tailorProfile) {
        setLoading(false);
        return;
      }
      setTailorId(tailorProfile.id);

      const { data: allGarmentTypes } = await supabase
        .from("garment_types")
        .select("id, name")
        .order("name");
      setGarmentTypes(allGarmentTypes ?? []);

      const { data: existingPrices } = await supabase
        .from("tailor_service_prices")
        .select("garment_type_id, price")
        .eq("tailor_id", tailorProfile.id);

      const priceMap: Record<string, string> = {};
      for (const p of existingPrices ?? []) {
        priceMap[p.garment_type_id] = p.price.toString();
      }
      setPrices(priceMap);
      setLoading(false);
    })();
  }, [user, router]);

  async function handleSave() {
    if (!tailorId) return;
    setPending(true);
    setError(null);
    setSaved(false);

    await supabase.from("tailor_service_prices").delete().eq("tailor_id", tailorId);

    const rows = Object.entries(prices)
      .filter(([, value]) => value.trim() !== "")
      .map(([garmentTypeId, value]) => ({
        tailor_id: tailorId,
        garment_type_id: garmentTypeId,
        price: Number(value),
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("tailor_service_prices")
        .insert(rows);

      if (insertError) {
        setError(insertError.message);
        setPending(false);
        return;
      }
    }

    setPending(false);
    setSaved(true);
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
      <Text style={styles.title}>Standard prices</Text>
      <Text style={styles.subtitle}>
        Set a standard rate per garment type. Customers see this before
        requesting a job; you can still quote a custom price when accepting.
      </Text>

      {garmentTypes.map((gt) => (
        <View key={gt.id}>
          <Text style={styles.label}>{gt.name}</Text>
          <TextInput
            style={styles.input}
            placeholder="No standard price set"
            keyboardType="numeric"
            value={prices[gt.id] ?? ""}
            onChangeText={(text) =>
              setPrices((prev) => ({ ...prev, [gt.id]: text }))
            }
          />
        </View>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}
      {saved && <Text style={styles.saved}>Saved.</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Saving..." : "Save prices"}
        </Text>
      </Pressable>
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
  subtitle: {
    color: "#475569",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
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
  saved: {
    color: "#16a34a",
  },
});
