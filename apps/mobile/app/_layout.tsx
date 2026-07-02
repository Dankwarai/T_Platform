import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/auth-context";

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "login" || segments[0] === "signup";
    const atRoot = pathname === "/";

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && (inAuthGroup || atRoot)) {
      router.replace("/home");
    }
  }, [session, loading, segments, pathname, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
