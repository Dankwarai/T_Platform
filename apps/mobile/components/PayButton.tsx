import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";

export function PayButton({
  targetType,
  targetId,
  paymentMethod,
  paymentStatus,
  onPaid,
}: {
  targetType: "job" | "order";
  targetId: string;
  paymentMethod: string | null;
  paymentStatus: string;
  onPaid: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (paymentMethod !== "in_app" || paymentStatus === "paid") {
    return null;
  }

  async function handlePay() {
    setPending(true);
    setError(null);

    const redirectUrl = Linking.createURL("payment-callback");
    const { data, error } = await supabase.functions.invoke("initialize-payment", {
      body: { targetType, targetId, redirectUrl },
    });

    if (error || !data?.authorization_url) {
      setError(error?.message ?? "Failed to start payment.");
      setPending(false);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      data.authorization_url,
      redirectUrl,
    );
    setPending(false);

    if (result.type === "success") {
      // The webhook may not have landed yet by the time the browser
      // closes and control returns here — poll briefly rather than
      // assume payment_status is already updated.
      setConfirming(true);
      let attempts = 0;
      const interval = setInterval(() => {
        attempts += 1;
        onPaid();
        if (attempts >= 5) {
          clearInterval(interval);
          setConfirming(false);
        }
      }, 2000);
    }
  }

  if (confirming) {
    return <Text style={styles.confirming}>Confirming payment...</Text>;
  }

  return (
    <>
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handlePay}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Opening checkout..." : "Pay now"}
        </Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  confirming: {
    color: "#666",
  },
});
