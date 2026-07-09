import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { supabase } from "../lib/supabase";

type Variant = {
  id: string;
  variant_name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
};

export function BuyForm({
  supplierId,
  variants,
  onChange,
}: {
  supplierId: string;
  variants: Variant[];
  onChange: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [fulfillmentType, setFulfillmentType] = useState<
    "local_pickup" | "supplier_shipping"
  >("local_pickup");
  const [paymentMethod, setPaymentMethod] = useState<"in_app" | "offline">(
    "offline",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setVisible(profile?.role === "customer");
    });
  }, []);

  async function handleSubmit() {
    setPending(true);
    setError(null);

    const { data, error } = await supabase.rpc("create_order", {
      p_supplier_id: supplierId,
      p_fulfillment_type: fulfillmentType,
      p_payment_method: paymentMethod,
      p_items: [{ variant_id: variantId, quantity: Number(quantity) }],
    });

    if (error) {
      setError(error.message);
      setPending(false);
      return;
    }

    setOrderId(data as string);
    setPending(false);
    onChange();
  }

  if (!visible) {
    return null;
  }

  if (variants.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>
          Out of stock — no variants available.
        </Text>
      </View>
    );
  }

  if (orderId) {
    return (
      <View style={styles.container}>
        <Text style={styles.success}>
          Order placed — track it from{" "}
          <Link href={`/orders/${orderId}`} style={styles.link}>
            My orders
          </Link>
          .
        </Text>
      </View>
    );
  }

  const selectedVariant = variants.find((v) => v.id === variantId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buy</Text>

      <Text style={styles.label}>Variant</Text>
      <View style={styles.optionRow}>
        {variants.map((v) => (
          <Pressable
            key={v.id}
            style={[
              styles.option,
              variantId === v.id && styles.optionSelected,
              v.stock_quantity <= 0 && styles.optionDisabled,
            ]}
            disabled={v.stock_quantity <= 0}
            onPress={() => setVariantId(v.id)}
          >
            <Text style={styles.optionText}>
              {v.variant_name} — {v.price}/{v.unit_type} ({v.stock_quantity}{" "}
              left)
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Quantity ({selectedVariant?.unit_type})</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <Text style={styles.label}>Fulfillment</Text>
      <View style={styles.optionRow}>
        <Pressable
          style={styles.radioRow}
          onPress={() => setFulfillmentType("local_pickup")}
        >
          <Text>
            {fulfillmentType === "local_pickup" ? "◉" : "○"} Local pickup
          </Text>
        </Pressable>
        <Pressable
          style={styles.radioRow}
          onPress={() => setFulfillmentType("supplier_shipping")}
        >
          <Text>
            {fulfillmentType === "supplier_shipping" ? "◉" : "○"} Supplier
            shipping
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Payment</Text>
      <View style={styles.optionRow}>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPaymentMethod("offline")}
        >
          <Text>{paymentMethod === "offline" ? "◉" : "○"} Pay offline</Text>
        </Pressable>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPaymentMethod("in_app")}
        >
          <Text>{paymentMethod === "in_app" ? "◉" : "○"} Pay in-app</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Placing order..." : "Place order"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  title: {
    fontWeight: "600",
  },
  label: {
    fontWeight: "600",
    fontSize: 13,
  },
  meta: {
    color: "#475569",
  },
  optionRow: {
    gap: 6,
  },
  option: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 8,
  },
  optionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 13,
  },
  radioRow: {
    paddingVertical: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
  },
  error: {
    color: "#dc2626",
  },
  success: {
    color: "#16a34a",
  },
  link: {
    textDecorationLine: "underline",
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
