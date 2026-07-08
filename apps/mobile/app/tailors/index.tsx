import { useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SkillBadge } from "../../components/SkillBadge";
import { supabase } from "../../lib/supabase";

type TailorResult = {
  id: string;
  business_name: string;
  bio: string | null;
  location: string;
  years_experience: number | null;
  avg_rating: number;
  rating_count: number;
  skill_tier: string;
};

const RATING_FILTERS = [0, 3, 4, 4.5];

export default function TailorsScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [results, setResults] = useState<TailorResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = supabase
        .from("tailor_profiles")
        .select(
          "id, business_name, bio, location, years_experience, avg_rating, rating_count, skill_tier",
        )
        .neq("business_name", "")
        .order("avg_rating", { ascending: false });

      if (name) query = query.ilike("business_name", `%${name}%`);
      if (location) query = query.ilike("location", `%${location}%`);
      if (minRating > 0) query = query.gte("avg_rating", minRating);

      const { data } = await query;
      setResults(data ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [name, location, minRating]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a tailor</Text>

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

      <View style={styles.ratingRow}>
        {RATING_FILTERS.map((rating) => (
          <Pressable
            key={rating}
            style={[
              styles.ratingOption,
              minRating === rating && styles.ratingSelected,
            ]}
            onPress={() => setMinRating(rating)}
          >
            <Text>{rating === 0 ? "Any" : `${rating}+ ★`}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading...</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No tailors found.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/tailors/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{item.business_name}</Text>
                  <SkillBadge tier={item.skill_tier} />
                </View>
                <Text style={styles.cardMeta}>
                  {item.rating_count > 0
                    ? `★ ${item.avg_rating.toFixed(1)} (${item.rating_count})`
                    : "No reviews yet"}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {item.location}
                {item.years_experience
                  ? ` · ${item.years_experience} yrs experience`
                  : ""}
              </Text>
              {item.bio && <Text style={styles.cardBio}>{item.bio}</Text>}
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 8,
  },
  ratingOption: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ratingSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5",
  },
  list: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontWeight: "600",
  },
  cardMeta: {
    color: "#666",
    fontSize: 13,
  },
  cardBio: {
    color: "#888",
    fontSize: 13,
  },
  empty: {
    color: "#666",
    marginTop: 12,
  },
});
