import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { supabase } from "../lib/supabase";

// tflatform:// is registered as this app's scheme in app.json — Expo Router
// maps tflatform://reset-password straight to app/reset-password.tsx.
const RESET_PASSWORD_REDIRECT = "tflatform://reset-password";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_PASSWORD_REDIRECT,
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          If an account exists for {email}, a password reset link has been
          sent.
        </Text>
        <Link href="/login" style={styles.link}>
          Back to log in
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.body}>
        Enter your email and we&apos;ll send you a link to reset your
        password.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Sending..." : "Send reset link"}
        </Text>
      </Pressable>

      <Link href="/login" style={styles.link}>
        Back to log in
      </Link>
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
    marginBottom: 4,
  },
  body: {
    color: "#475569",
    marginBottom: 8,
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
