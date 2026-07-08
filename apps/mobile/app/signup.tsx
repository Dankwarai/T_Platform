import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import type { UserRole } from "@t-flatform/types";
import { supabase } from "../lib/supabase";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSignup() {
    setPending(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      setError(error.message);
    }
    setPending(false);
    // On success, app/_layout.tsx's auth state listener redirects to /home.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign up</Text>

      <View style={styles.roleRow}>
        <Pressable
          style={[styles.roleOption, role === "customer" && styles.roleSelected]}
          onPress={() => setRole("customer")}
        >
          <Text>Customer</Text>
        </Pressable>
        <Pressable
          style={[styles.roleOption, role === "tailor" && styles.roleSelected]}
          onPress={() => setRole("tailor")}
        >
          <Text>Tailor</Text>
        </Pressable>
        <Pressable
          style={[styles.roleOption, role === "supplier" && styles.roleSelected]}
          onPress={() => setRole("supplier")}
        >
          <Text>Supplier</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Signing up..." : "Sign up"}
        </Text>
      </Pressable>

      <Link href="/login" style={styles.link}>
        Already have an account? Log in
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
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  roleSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  button: {
    backgroundColor: "#111",
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
