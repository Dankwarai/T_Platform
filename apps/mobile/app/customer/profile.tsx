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
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

export default function CustomerProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [preferredUnit, setPreferredUnit] = useState<"cm" | "inch">("cm");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setFullName(userRow?.full_name ?? "");

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("location, bio, preferred_unit")
        .eq("user_id", user.id)
        .single();

      if (customerProfile) {
        setLocation(customerProfile.location ?? "");
        setBio(customerProfile.bio ?? "");
        setPreferredUnit(customerProfile.preferred_unit);
      }

      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit() {
    if (!user) return;
    setPending(true);
    setError(null);
    setSaved(false);

    const { error: userError } = await supabase
      .from("users")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (userError) {
      setError(userError.message);
      setPending(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("customer_profiles")
      .update({
        location: location || null,
        bio: bio || null,
        preferred_unit: preferredUnit,
      })
      .eq("user_id", user.id);

    if (profileError) {
      setError(profileError.message);
      setPending(false);
      return;
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
      <Text style={styles.title}>My profile</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Location (optional)"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Bio (optional)"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
      />

      <View style={styles.optionRow}>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPreferredUnit("cm")}
        >
          <Text>{preferredUnit === "cm" ? "◉" : "○"} Centimeters</Text>
        </Pressable>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPreferredUnit("inch")}
        >
          <Text>{preferredUnit === "inch" ? "◉" : "○"} Inches</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {saved && <Text style={styles.success}>Saved.</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>{pending ? "Saving..." : "Save"}</Text>
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
  optionRow: {
    flexDirection: "row",
    gap: 16,
  },
  radioRow: {
    paddingVertical: 2,
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
  success: {
    color: "#16a34a",
  },
});
