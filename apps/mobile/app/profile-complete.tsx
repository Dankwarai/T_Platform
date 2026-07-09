import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { useAuth } from "../contexts/auth-context";
import { supabase } from "../lib/supabase";
import { getStorageImageUrl } from "../lib/storage-image-url";
import { AvatarUpload } from "../components/AvatarUpload";

type GarmentType = { id: string; name: string };

export default function ProfileCompleteScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tailorProfileId, setTailorProfileId] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [specialtyIds, setSpecialtyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase
        .from("tailor_profiles")
        .select(
          "id, business_name, location, bio, years_experience, portfolio_images, avatar_path",
        )
        .eq("user_id", user.id)
        .single();

      if (data) {
        setTailorProfileId(data.id);
        setAvatarPath(data.avatar_path ?? null);
        setBusinessName(data.business_name ?? "");
        setLocation(data.location ?? "");
        setBio(data.bio ?? "");
        setYearsExperience(data.years_experience?.toString() ?? "");
        setPortfolioImages(data.portfolio_images ?? []);

        const { data: existingSpecialties } = await supabase
          .from("tailor_specialties")
          .select("garment_type_id")
          .eq("tailor_id", data.id);
        setSpecialtyIds(
          new Set((existingSpecialties ?? []).map((s) => s.garment_type_id)),
        );
      }

      const { data: allGarmentTypes } = await supabase
        .from("garment_types")
        .select("id, name")
        .order("name");
      setGarmentTypes(allGarmentTypes ?? []);

      setLoading(false);
    })();
  }, [user]);

  function toggleSpecialty(id: string) {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handlePickPortfolioImage() {
    if (!tailorProfileId) return;

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
    const path = `${tailorProfileId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("tailor-portfolio-images")
      .upload(path, arrayBuffer, {
        contentType: asset.mimeType ?? "image/jpeg",
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const nextImages = [...portfolioImages, path];
    const { error: updateError } = await supabase
      .from("tailor_profiles")
      .update({ portfolio_images: nextImages })
      .eq("id", tailorProfileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setPortfolioImages(nextImages);
    setUploading(false);
  }

  async function handleDeletePortfolioImage(path: string) {
    if (!tailorProfileId) return;
    setUploading(true);
    setError(null);

    await supabase.storage.from("tailor-portfolio-images").remove([path]);

    const nextImages = portfolioImages.filter((p) => p !== path);
    const { error: updateError } = await supabase
      .from("tailor_profiles")
      .update({ portfolio_images: nextImages })
      .eq("id", tailorProfileId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setPortfolioImages(nextImages);
    setUploading(false);
  }

  async function handleSubmit() {
    if (!user) return;
    setPending(true);
    setError(null);

    const { data: tailorProfile, error } = await supabase
      .from("tailor_profiles")
      .update({
        business_name: businessName,
        location,
        bio: bio || null,
        years_experience: yearsExperience ? Number(yearsExperience) : null,
      })
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error || !tailorProfile) {
      setError(error?.message ?? "Failed to save profile.");
      setPending(false);
      return;
    }

    await supabase
      .from("tailor_specialties")
      .delete()
      .eq("tailor_id", tailorProfile.id);

    if (specialtyIds.size > 0) {
      const { error: specialtiesError } = await supabase
        .from("tailor_specialties")
        .insert(
          Array.from(specialtyIds).map((garmentTypeId) => ({
            tailor_id: tailorProfile.id,
            garment_type_id: garmentTypeId,
          })),
        );

      if (specialtiesError) {
        setError(specialtiesError.message);
        setPending(false);
        return;
      }
    }

    router.replace("/home");
  }

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete your tailor profile</Text>
      <Text style={styles.subtitle}>
        Customers will see this on your public profile.
      </Text>

      {user && tailorProfileId && (
        <AvatarUpload
          table="tailor_profiles"
          profileId={tailorProfileId}
          userId={user.id}
          avatarPath={avatarPath}
          onChange={setAvatarPath}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Business name"
        value={businessName}
        onChangeText={setBusinessName}
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Bio (optional)"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
      />
      <TextInput
        style={styles.input}
        placeholder="Years of experience (optional)"
        value={yearsExperience}
        onChangeText={setYearsExperience}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Specialties</Text>
      <View style={styles.specialtyRow}>
        {garmentTypes.map((gt) => (
          <Pressable
            key={gt.id}
            style={[
              styles.specialtyOption,
              specialtyIds.has(gt.id) && styles.specialtyOptionSelected,
            ]}
            onPress={() => toggleSpecialty(gt.id)}
          >
            <Text>{gt.name}</Text>
          </Pressable>
        ))}
      </View>

      {tailorProfileId && (
        <>
          <Text style={styles.label}>Portfolio</Text>
          {portfolioImages.length > 0 && (
            <View style={styles.imageRow}>
              {portfolioImages.map((path) => (
                <View key={path} style={styles.imageWrapper}>
                  <Image
                    source={{
                      uri: getStorageImageUrl("tailor-portfolio-images", path),
                    }}
                    style={styles.thumbnail}
                  />
                  <Pressable
                    style={styles.imageDeleteButton}
                    onPress={() => handleDeletePortfolioImage(path)}
                    disabled={uploading}
                  >
                    <Text style={styles.imageDeleteButtonText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Pressable
            style={[styles.addImageButton, uploading && styles.buttonDisabled]}
            onPress={handlePickPortfolioImage}
            disabled={uploading}
          >
            <Text style={styles.addImageButtonText}>
              {uploading ? "Uploading..." : "Add photo"}
            </Text>
          </Pressable>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending}
      >
        <Text style={styles.buttonText}>
          {pending ? "Saving..." : "Save and continue"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  subtitle: {
    color: "#475569",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
  },
  specialtyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialtyOption: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  specialtyOptionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
  },
  imageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageWrapper: {
    position: "relative",
  },
  thumbnail: {
    height: 80,
    width: 80,
    borderRadius: 8,
  },
  imageDeleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  imageDeleteButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  addImageButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  addImageButtonText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
