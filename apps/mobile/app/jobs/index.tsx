import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

type JobRow = {
  id: string;
  status: string;
  due_date: string | null;
  garment_types: { name: string } | null;
  tailor_profiles: { business_name: string } | null;
  measurement_records: {
    label: string;
    customer_profiles: { users: { full_name: string } | null } | null;
  } | null;
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In progress",
  ready_for_fitting: "Ready for fitting",
  adjusting: "Adjusting",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function JobsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
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

      const { data } = await supabase
        .from("jobs")
        .select(
          "id, status, due_date, garment_types(name), tailor_profiles(business_name), measurement_records(label, customer_profiles(users(full_name)))",
        )
        .order("created_at", { ascending: false });

      setJobs((data as unknown as JobRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My jobs</Text>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No jobs yet.</Text>}
          renderItem={({ item }) => {
            const counterpart =
              role === "tailor"
                ? item.measurement_records?.customer_profiles?.users
                    ?.full_name
                : item.tailor_profiles?.business_name;

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/jobs/${item.id}`)}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>
                    {item.measurement_records?.label} ·{" "}
                    {item.garment_types?.name}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {counterpart ?? "Unknown"}
                    {item.due_date ? ` · due ${item.due_date}` : ""}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </Pressable>
            );
          }}
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
  cardBody: {
    flex: 1,
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
