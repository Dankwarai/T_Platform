import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

type MeasurementRecordRow = {
  id: string;
  label: string;
  unit: string;
  created_at: string;
  garment_types: { name: string } | null;
};

export default function MeasurementsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<MeasurementRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "customer") {
        router.replace("/home");
        return;
      }

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("measurement_records")
        .select("id, label, unit, created_at, garment_types(name)")
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false });

      setRecords((data as unknown as MeasurementRecordRow[]) ?? []);
      setLoading(false);
    })();
  }, [user, router]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My measurements</Text>
        <Pressable
          style={styles.newButton}
          onPress={() => router.push("/measurements/new")}
        >
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No measurement records yet.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/measurements/${item.id}`)}
            >
              <View>
                <Text style={styles.cardTitle}>{item.label}</Text>
                <Text style={styles.cardMeta}>
                  {item.garment_types?.name} ·{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.cardMeta}>{item.unit}</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  newButton: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  newButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  list: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  cardTitle: {
    fontWeight: "600",
  },
  cardMeta: {
    color: "#666",
    fontSize: 13,
  },
  empty: {
    color: "#666",
    marginTop: 12,
  },
});
