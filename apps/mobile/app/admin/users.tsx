import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_suspended: boolean;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("users")
      .select("id, email, full_name, role, is_suspended")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function toggleSuspend(userRow: UserRow) {
    setPendingId(userRow.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("users")
      .update({ is_suspended: !userRow.is_suspended })
      .eq("id", userRow.id);

    if (updateError) {
      setError(updateError.message);
      setPendingId(null);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userRow.id ? { ...u, is_suspended: !u.is_suspended } : u,
      ),
    );
    setPendingId(null);
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Users</Text>
      <TextInput
        style={styles.input}
        placeholder="Search by name or email"
        value={search}
        onChangeText={setSearch}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.meta}>No users found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>
                  {item.full_name || "(no name)"}
                  {item.is_suspended ? "  [Suspended]" : ""}
                </Text>
                <Text style={styles.meta}>
                  {item.email} · {item.role}
                </Text>
              </View>
              <Pressable
                style={styles.smallButton}
                onPress={() => toggleSuspend(item)}
                disabled={pendingId === item.id}
              >
                <Text style={styles.smallButtonText}>
                  {item.is_suspended ? "Unsuspend" : "Suspend"}
                </Text>
              </Pressable>
            </View>
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
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    color: "#475569",
    fontSize: 13,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
