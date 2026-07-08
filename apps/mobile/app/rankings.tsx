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
import { SkillBadge } from "../components/SkillBadge";
import { supabase } from "../lib/supabase";

type GarmentType = { id: string; name: string };
type RankedTailor = {
  id: string;
  business_name: string;
  location: string;
  avg_rating: number;
  rating_count: number;
  follower_count: number;
  skill_tier: string;
};

export default function RankingsScreen() {
  const router = useRouter();
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [location, setLocation] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [results, setResults] = useState<RankedTailor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("garment_types")
      .select("id, name")
      .order("name")
      .then(({ data }) => setGarmentTypes(data ?? []));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);

      let query = specialtyId
        ? supabase
            .from("tailor_profiles")
            .select(
              "id, business_name, location, avg_rating, rating_count, follower_count, skill_tier, tailor_specialties!inner(garment_type_id)",
            )
            .eq("tailor_specialties.garment_type_id", specialtyId)
        : supabase
            .from("tailor_profiles")
            .select(
              "id, business_name, location, avg_rating, rating_count, follower_count, skill_tier",
            );

      query = query
        .neq("business_name", "")
        .order("follower_count", { ascending: false });

      if (location) query = query.ilike("location", `%${location}%`);

      const { data } = await query;
      setResults((data as unknown as RankedTailor[]) ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [location, specialtyId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top tailors</Text>

      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />

      <View style={styles.optionRow}>
        <Pressable
          style={[styles.option, specialtyId === "" && styles.optionSelected]}
          onPress={() => setSpecialtyId("")}
        >
          <Text>Any</Text>
        </Pressable>
        {garmentTypes.map((gt) => (
          <Pressable
            key={gt.id}
            style={[
              styles.option,
              specialtyId === gt.id && styles.optionSelected,
            ]}
            onPress={() => setSpecialtyId(gt.id)}
          >
            <Text>{gt.name}</Text>
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
          ListEmptyComponent={
            <Text style={styles.empty}>No tailors found.</Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/tailors/${item.id}`)}
            >
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>{item.business_name}</Text>
                  <SkillBadge tier={item.skill_tier} />
                </View>
                <Text style={styles.cardMeta}>
                  {item.location}
                  {item.rating_count > 0
                    ? ` · ★ ${item.avg_rating.toFixed(1)}`
                    : ""}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderColor: "#111",
    backgroundColor: "#f5f5f5",
  },
  list: {
    gap: 12,
    paddingTop: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  rank: {
    width: 24,
    fontSize: 16,
    fontWeight: "700",
    color: "#999",
  },
  cardBody: {
    flex: 1,
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
  empty: {
    color: "#666",
    marginTop: 12,
  },
});
