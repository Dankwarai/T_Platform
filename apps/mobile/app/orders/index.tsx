import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

type OrderRow = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer_id: string;
  supplier_profiles: { business_name: string } | null;
  buyer?: { full_name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function OrdersListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role ?? null);

      // RLS already scopes this to orders the user participates in, either
      // as the buyer or the receiving supplier.
      const { data } = await supabase
        .from("orders")
        .select(
          "id, status, total_amount, created_at, buyer_id, supplier_profiles(business_name)",
        )
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as OrderRow[];

      // Buyer names aren't embeddable via a direct FK select (orders.buyer_id
      // -> users), so fetch them separately for the supplier's view.
      if (profile?.role === "supplier" && rows.length > 0) {
        const { data: buyers } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", rows.map((r) => r.buyer_id));
        const byId = new Map((buyers ?? []).map((b) => [b.id, b]));
        rows.forEach((r) => {
          r.buyer = byId.get(r.buyer_id) ?? null;
        });
      }

      setOrders(rows);
      setLoading(false);
    })();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {role === "supplier" ? "Orders received" : "My orders"}
      </Text>

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.meta}>No orders yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/orders/${item.id}`)}
            >
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {role === "supplier"
                    ? item.buyer?.full_name
                    : item.supplier_profiles?.business_name}
                </Text>
                <Text style={styles.meta}>
                  {item.total_amount} ·{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.meta}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "600",
  },
  meta: {
    color: "#666",
    fontSize: 13,
  },
});
