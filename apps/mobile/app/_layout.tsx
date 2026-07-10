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

    // "reset-password" is deliberately not in this group: unlike
    // login/signup/forgot-password, a session existing there is expected
    // (verifyOtp establishes a recovery session before the user has set a
    // new password) and shouldn't bounce them to /home mid-flow.
    const isAuthOnlyRoute =
      segments[0] === "login" ||
      segments[0] === "signup" ||
      segments[0] === "forgot-password";
    const isPublicRoute = isAuthOnlyRoute || segments[0] === "reset-password";
    const atRoot = pathname === "/";

    if (!session && !isPublicRoute) {
      router.replace("/login");
    } else if (session && (isAuthOnlyRoute || atRoot)) {
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
