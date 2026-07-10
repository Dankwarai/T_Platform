import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

// Reached via the tflatform://reset-password?token_hash=...&type=recovery
// deep link from the reset email (see supabase/templates/recovery.html).
// There's no server here to verify token_hash the way the web app's
// /auth/confirm route does, so it happens directly on-device: verifyOtp
// establishes the recovery session in this client and persists it to
// AsyncStorage like any other sign-in.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token_hash } = useLocalSearchParams<{ token_hash?: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );

  useEffect(() => {
    if (!token_hash) {
      setStatus("invalid");
      return;
    }

    supabase.auth
      .verifyOtp({ type: "recovery", token_hash })
      .then(({ error }) => {
        setStatus(error ? "invalid" : "ready");
      });
  }, [token_hash]);

  async function handleSubmit() {
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setPending(false);
    router.replace("/home");
  }

  if (status === "checking") {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Verifying reset link...</Text>
      </View>
    );
  }

  if (status === "invalid") {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>
          This reset link is invalid or has expired.
        </Text>
        <Link href="/forgot-password" style={styles.link}>
          Request a new link
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set a new password</Text>

      <TextInput
        style={styles.input}
        placeholder="New password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Saving..." : "Save new password"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    color: "#475569",
    textAlign: "center",
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
  link: {
    marginTop: 16,
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
