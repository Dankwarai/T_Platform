import { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

// Mobile-side equivalent of web's admin/layout.tsx: a single role gate for
// the whole /admin section via Expo Router's nested-layout support, rather
// than repeating the "fetch role, redirect if not X" check used elsewhere
// (e.g. tailor-prices.tsx) on every admin screen individually.
export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;

    supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "admin") {
          router.replace("/home");
          return;
        }
        setIsAdmin(true);
      });
  }, [user, authLoading, router]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
