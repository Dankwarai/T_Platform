import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";

type Profile = { full_name: string; role: string };

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("full_name, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    if (!user || profile?.role !== "tailor") return;
    supabase
      .from("tailor_profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.business_name === "") {
          router.replace("/profile-complete");
        }
      });
  }, [user, profile, router]);

  useEffect(() => {
    if (!user || profile?.role !== "supplier") return;
    supabase
      .from("supplier_profiles")
      .select("business_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.business_name === "") {
          router.replace("/supplier/profile");
        }
      });
  }, [user, profile, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    // app/_layout.tsx's auth state listener redirects to /login.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
      </Text>
      <Text style={styles.subtitle}>
        {user?.email} · {profile?.role ?? "unknown role"}
      </Text>

      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={() => router.push("/tailors")}
      >
        <Text style={styles.primaryButtonText}>Find tailors</Text>
      </Pressable>

      {profile?.role === "customer" && (
        <Pressable
          style={styles.button}
          onPress={() => router.push("/measurements")}
        >
          <Text style={styles.buttonText}>My measurements</Text>
        </Pressable>
      )}

      {profile?.role === "tailor" && (
        <Pressable
          style={styles.button}
          onPress={() => router.push("/tailor-prices")}
        >
          <Text style={styles.buttonText}>Set prices</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={() => router.push("/jobs")}>
        <Text style={styles.buttonText}>My jobs</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push("/rankings")}>
        <Text style={styles.buttonText}>Top tailors</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/suggestions")}
      >
        <Text style={styles.buttonText}>Suggested tailors</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push("/products")}>
        <Text style={styles.buttonText}>Browse marketplace</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={() => router.push("/suppliers")}>
        <Text style={styles.buttonText}>Find suppliers</Text>
      </Pressable>

      {profile?.role === "supplier" && (
        <Pressable
          style={styles.button}
          onPress={() => router.push("/supplier/products")}
        >
          <Text style={styles.buttonText}>My products</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={() => router.push("/orders")}>
        <Text style={styles.buttonText}>
          {profile?.role === "supplier" ? "Orders received" : "My orders"}
        </Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    color: "#475569",
  },
  button: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
