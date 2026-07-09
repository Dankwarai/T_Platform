import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { supabase } from "../lib/supabase";
import { getStorageImageUrl } from "../lib/storage-image-url";

export function AvatarUpload({
  table,
  profileId,
  userId,
  avatarPath,
  onChange,
}: {
  table: "tailor_profiles" | "supplier_profiles";
  profileId: string;
  userId: string;
  avatarPath: string | null;
  onChange: (path: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setUploading(true);
    setError(null);

    const file = new File(asset.uri);
    const arrayBuffer = await file.arrayBuffer();
    const ext = asset.fileName?.split(".").pop() ?? "jpg";
    // Storage RLS scopes writes by auth.uid() folder, not by profileId.
    const path = `${userId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, arrayBuffer, {
        contentType: asset.mimeType ?? "image/jpeg",
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ avatar_path: path })
      .eq("id", profileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }

    onChange(path);
    setUploading(false);
  }

  async function handleRemove() {
    if (!avatarPath) return;
    setUploading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from(table)
      .update({ avatar_path: null })
      .eq("id", profileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    await supabase.storage.from("avatars").remove([avatarPath]);
    onChange(null);
    setUploading(false);
  }

  return (
    <View style={styles.row}>
      {avatarPath ? (
        <Image
          source={{ uri: getStorageImageUrl("avatars", avatarPath) }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder} />
      )}
      <View style={styles.actions}>
        <Pressable
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handlePick}
          disabled={uploading}
        >
          <Text style={styles.buttonText}>
            {uploading ? "Uploading..." : "Change photo"}
          </Text>
        </Pressable>
        {avatarPath && (
          <Pressable onPress={handleRemove} disabled={uploading}>
            <Text style={styles.removeText}>Remove photo</Text>
          </Pressable>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "#e2e8f0",
  },
  actions: {
    gap: 4,
    alignItems: "flex-start",
  },
  button: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
  },
  removeText: {
    fontSize: 12,
    color: "#dc2626",
    textDecorationLine: "underline",
  },
  error: {
    fontSize: 12,
    color: "#dc2626",
  },
});
