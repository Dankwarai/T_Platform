import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  status: string;
  fulfillment_type: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  buyer_id: string;
  supplier_id: string;
  supplier_profiles: { user_id: string; business_name: string } | null;
};

type OrderItem = {
  id: string;
  quantity: number;
  unit_price_at_purchase: number;
  subtotal: number;
  product_variants: {
    variant_name: string;
    unit_type: string;
    products: { id: string; name: string } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: orderData } = await supabase
      .from("orders")
      .select(
        "id, status, fulfillment_type, payment_method, payment_status, total_amount, buyer_id, supplier_id, supplier_profiles(user_id, business_name)",
      )
      .eq("id", id)
      .single();

    setOrder(orderData as unknown as Order);

    if (orderData) {
      const { data: buyer } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", orderData.buyer_id)
        .single();
      setBuyerName(buyer?.full_name ?? null);
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select(
        "id, quantity, unit_price_at_purchase, subtotal, product_variants(variant_name, unit_type, products(id, name))",
      )
      .eq("order_id", id);
    setItems((itemsData as unknown as OrderItem[]) ?? []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: string) {
    setPending(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    await load();
    setPending(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text>Order not found.</Text>
      </View>
    );
  }

  const isSupplier = order.supplier_profiles?.user_id === user?.id;
  const isBuyer = order.buyer_id === user?.id;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Order {STATUS_LABELS[order.status] ?? order.status}
      </Text>
      <Text style={styles.meta}>
        {isSupplier ? "Buyer" : "Supplier"}:{" "}
        {isSupplier ? buyerName : order.supplier_profiles?.business_name}
      </Text>
      <Text style={styles.meta}>
        {order.fulfillment_type === "local_pickup"
          ? "Local pickup"
          : "Supplier shipping"}
        {" · "}
        {order.payment_method === "in_app" ? "Paid in-app" : "Pay offline"}
        {" · "}
        {order.payment_status}
      </Text>

      {items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Link
            href={`/products/${item.product_variants?.products?.id}`}
            style={styles.link}
          >
            {item.product_variants?.products?.name} —{" "}
            {item.product_variants?.variant_name}
          </Link>
          <Text style={styles.meta}>
            {item.quantity} {item.product_variants?.unit_type} ×{" "}
            {item.unit_price_at_purchase} = {item.subtotal}
          </Text>
        </View>
      ))}

      <Text style={styles.total}>Total: {order.total_amount}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        {order.status === "pending" && isSupplier && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => updateStatus("confirmed")}
            disabled={pending}
          >
            <Text style={styles.primaryButtonText}>Confirm order</Text>
          </Pressable>
        )}
        {order.status === "pending" && isBuyer && (
          <Pressable
            style={[styles.button, styles.dangerButton]}
            onPress={() => updateStatus("cancelled")}
            disabled={pending}
          >
            <Text style={styles.dangerButtonText}>Cancel order</Text>
          </Pressable>
        )}
        {order.status === "confirmed" && isSupplier && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => updateStatus("ready")}
            disabled={pending}
          >
            <Text style={styles.primaryButtonText}>Mark ready</Text>
          </Pressable>
        )}
        {order.status === "ready" && isSupplier && (
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => updateStatus("completed")}
            disabled={pending}
          >
            <Text style={styles.primaryButtonText}>Mark completed</Text>
          </Pressable>
        )}
      </View>

      {order.status === "completed" && isBuyer && (
        <Text style={styles.meta}>
          Order complete — you can leave a review from each product&apos;s
          page.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 8,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  meta: {
    color: "#666",
  },
  itemRow: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    gap: 2,
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  total: {
    textAlign: "right",
    fontWeight: "600",
    marginTop: 8,
  },
  error: {
    color: "#dc2626",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  dangerButton: {
    borderColor: "#dc2626",
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "600",
  },
});
