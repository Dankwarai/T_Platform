import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type Counts = {
  tailors: number;
  customers: number;
  suppliers: number;
  jobs: number;
  orders: number;
  reviews: number;
};

export default function AdminOverviewScreen() {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    (async () => {
      const [tailors, customers, suppliers, jobs, orders, reviews] =
        await Promise.all([
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "tailor"),
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "customer"),
          supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "supplier"),
          supabase.from("jobs").select("*", { count: "exact", head: true }),
          supabase.from("orders").select("*", { count: "exact", head: true }),
          supabase.from("reviews").select("*", { count: "exact", head: true }),
        ]);

      setCounts({
        tailors: tailors.count ?? 0,
        customers: customers.count ?? 0,
        suppliers: suppliers.count ?? 0,
        jobs: jobs.count ?? 0,
        orders: orders.count ?? 0,
        reviews: reviews.count ?? 0,
      });
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>

      {counts && (
        <View style={styles.statsGrid}>
          {(
            [
              ["Tailors", counts.tailors],
              ["Customers", counts.customers],
              ["Suppliers", counts.suppliers],
              ["Jobs", counts.jobs],
              ["Orders", counts.orders],
              ["Tailor reviews", counts.reviews],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={styles.button}
        onPress={() => router.push("/admin/users")}
      >
        <Text style={styles.buttonText}>Users</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/admin/reviews")}
      >
        <Text style={styles.buttonText}>Reviews</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/admin/products")}
      >
        <Text style={styles.buttonText}>Products</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => router.push("/admin/settings")}
      >
        <Text style={styles.buttonText}>Settings</Text>
      </Pressable>
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flexBasis: "30%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: "#475569",
    fontSize: 12,
  },
  button: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontWeight: "600",
  },
});
