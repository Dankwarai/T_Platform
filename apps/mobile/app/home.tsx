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
    color: "#666",
  },
  button: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
