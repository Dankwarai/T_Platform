import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { supabase } from "../../lib/supabase";

type GarmentType = { id: string; name: string };
type MeasurementField = {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  guide_instructions: string | null;
};

export default function NewMeasurementRecordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [garmentTypeId, setGarmentTypeId] = useState("");
  const [fields, setFields] = useState<MeasurementField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    supabase
      .from("garment_types")
      .select("id, name")
      .order("name")
      .then(({ data }) => setGarmentTypes(data ?? []));
  }, []);

  useEffect(() => {
    if (!garmentTypeId) {
      setFields([]);
      return;
    }
    supabase
      .from("measurement_fields")
      .select("id, field_key, field_label, display_order, guide_instructions")
      .eq("garment_type_id", garmentTypeId)
      .order("display_order")
      .then(({ data }) => {
        setFields(data ?? []);
        setValues({});
      });
  }, [garmentTypeId]);

  async function handleSubmit() {
    if (!user) return;
    setPending(true);
    setError(null);

    const { data: customerProfile } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!customerProfile) {
      setError("Customer profile not found.");
      setPending(false);
      return;
    }

    const { data: record, error: recordError } = await supabase
      .from("measurement_records")
      .insert({
        customer_id: customerProfile.id,
        garment_type_id: garmentTypeId,
        label,
        unit,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (recordError || !record) {
      setError(recordError?.message ?? "Failed to create record.");
      setPending(false);
      return;
    }

    const valueRows = fields
      .filter((field) => values[field.id])
      .map((field) => ({
        measurement_record_id: record.id,
        measurement_field_id: field.id,
        value: Number(values[field.id]),
      }));

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase
        .from("measurement_values")
        .insert(valueRows);

      if (valuesError) {
        setError(valuesError.message);
        setPending(false);
        return;
      }
    }

    router.replace(`/measurements/${record.id}`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>New measurement record</Text>

      <Text style={styles.label}>Garment type</Text>
      <View style={styles.optionRow}>
        {garmentTypes.map((gt) => (
          <Pressable
            key={gt.id}
            style={[
              styles.option,
              garmentTypeId === gt.id && styles.optionSelected,
            ]}
            onPress={() => setGarmentTypeId(gt.id)}
          >
            <Text>{gt.name}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Label (e.g. Wedding suit - 2026)"
        value={label}
        onChangeText={setLabel}
      />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.optionRow}>
        <Pressable
          style={[styles.option, unit === "cm" && styles.optionSelected]}
          onPress={() => setUnit("cm")}
        >
          <Text>cm</Text>
        </Pressable>
        <Pressable
          style={[styles.option, unit === "inch" && styles.optionSelected]}
          onPress={() => setUnit("inch")}
        >
          <Text>inch</Text>
        </Pressable>
      </View>

      {fields.map((field) => (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={styles.label}>
            {field.field_label} ({unit})
          </Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={values[field.id] ?? ""}
            onChangeText={(text) =>
              setValues((prev) => ({ ...prev, [field.id]: text }))
            }
          />
          {field.guide_instructions && (
            <Text style={styles.hint}>{field.guide_instructions}</Text>
          )}
        </View>
      ))}

      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending || !garmentTypeId || !label}
      >
        <Text style={styles.buttonText}>{pending ? "Saving..." : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 10,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  label: {
    fontWeight: "600",
    marginTop: 4,
  },
  optionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  option: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
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
  fieldGroup: {
    gap: 4,
  },
  hint: {
    color: "#64748b",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
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
