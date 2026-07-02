import { ActivityIndicator, StyleSheet, View } from "react-native";

// Redirect logic lives in app/_layout.tsx — this just covers the brief
// moment before the auth state resolves and the redirect fires.
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
