import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type SupplierResult = {
  id: string;
  business_name: string;
  bio: string | null;
  location: string;
  follower_count: number;
};

export default function SuppliersScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState<SupplierResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("supplier_profiles")
        .select("id, business_name, bio, location, follower_count")
        .neq("business_name", "")
        .order("follower_count", { ascending: false });

      if (name) query = query.ilike("business_name", `%${name}%`);
      if (location) query = query.ilike("location", `%${location}%`);

      const { data } = await query;
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, location]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a supplier</Text>

      <TextInput
        style={styles.input}
        placeholder="Search by name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />

      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.meta}>No suppliers found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/suppliers/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.business_name}</Text>
                <Text style={styles.meta}>
                  {item.follower_count} follower
                  {item.follower_count === 1 ? "" : "s"}
                </Text>
              </View>
              <Text style={styles.meta}>{item.location}</Text>
              {item.bio && <Text style={styles.bio}>{item.bio}</Text>}
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
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontWeight: "600",
  },
  meta: {
    color: "#475569",
    fontSize: 13,
  },
  bio: {
    color: "#475569",
    fontSize: 13,
    marginTop: 2,
  },
});
