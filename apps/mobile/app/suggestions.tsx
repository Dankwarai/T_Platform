import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";

type Suggestion = {
  candidate_user_id: string;
  tailor_id: string;
  business_name: string;
  location: string | null;
  avg_rating: number;
  follower_count: number;
  suggestion_score: number;
};

export default function SuggestionsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("get_follow_suggestions", { p_user_id: user.id, p_limit: 10 })
      .then(({ data }) => {
        setSuggestions((data as Suggestion[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggested tailors</Text>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.candidate_user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No suggestions yet — follow a few tailors or complete a
              measurement record to get personalized picks.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/tailors/${item.tailor_id}`)}
            >
              <Text style={styles.cardTitle}>{item.business_name}</Text>
              <Text style={styles.cardMeta}>
                {item.location}
                {item.avg_rating > 0
                  ? ` · ★ ${item.avg_rating.toFixed(1)}`
                  : ""}
                {" · "}
                {item.follower_count} follower
                {item.follower_count === 1 ? "" : "s"}
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
  list: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontWeight: "600",
  },
  cardMeta: {
    color: "#475569",
    fontSize: 13,
  },
  empty: {
    color: "#475569",
    marginTop: 12,
  },
});
