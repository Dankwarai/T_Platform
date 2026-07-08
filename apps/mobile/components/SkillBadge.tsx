import { StyleSheet, Text, View } from "react-native";

const TIER_LABELS: Record<string, string> = {
  beginner: "Beginner",
  skilled: "Skilled Tailor",
  expert: "Expert Tailor",
  master: "Master Tailor",
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: "#f4f4f5", text: "#52525b" },
  skilled: { bg: "#dbeafe", text: "#1d4ed8" },
  expert: { bg: "#ede9fe", text: "#6d28d9" },
  master: { bg: "#fef3c7", text: "#b45309" },
};

export function SkillBadge({ tier }: { tier: string }) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.beginner;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {TIER_LABELS[tier] ?? tier}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
