import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

type MeasurementField = {
  id: string;
  field_key: string;
  field_label: string;
  display_order: number;
  guide_instructions: string | null;
};

export default function MeasurementRecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState<"cm" | "inch">("cm");
  const [notes, setNotes] = useState("");
  const [garmentTypeName, setGarmentTypeName] = useState("");
  const [fields, setFields] = useState<MeasurementField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data: record } = await supabase
        .from("measurement_records")
        .select("label, unit, notes, garment_type_id, garment_types(name)")
        .eq("id", id)
        .single();

      if (!record) {
        setLoading(false);
        return;
      }

      setLabel(record.label);
      setUnit(record.unit);
      setNotes(record.notes ?? "");
      setGarmentTypeName(
        (record.garment_types as unknown as { name: string } | null)?.name ??
          "",
      );

      const { data: fieldsData } = await supabase
        .from("measurement_fields")
        .select("id, field_key, field_label, display_order, guide_instructions")
        .eq("garment_type_id", record.garment_type_id)
        .order("display_order");

      setFields(fieldsData ?? []);

      const { data: valuesData } = await supabase
        .from("measurement_values")
        .select("measurement_field_id, value")
        .eq("measurement_record_id", id);

      const valueMap: Record<string, string> = {};
      for (const v of valuesData ?? []) {
        valueMap[v.measurement_field_id] = v.value.toString();
      }
      setValues(valueMap);
      setLoading(false);
    })();
  }, [id]);

  async function handleSave() {
    setPending(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("measurement_records")
      .update({ label, unit, notes: notes || null })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    const valueRows = fields
      .filter((field) => values[field.id])
      .map((field) => ({
        measurement_record_id: id,
        measurement_field_id: field.id,
        value: Number(values[field.id]),
      }));

    if (valueRows.length > 0) {
      const { error: valuesError } = await supabase
        .from("measurement_values")
        .upsert(valueRows, {
          onConflict: "measurement_record_id,measurement_field_id",
        });

      if (valuesError) {
        setError(valuesError.message);
        setPending(false);
        return;
      }
    }

    setPending(false);
    router.replace("/measurements");
  }

  async function handleDelete() {
    const { error: deleteError } = await supabase
      .from("measurement_records")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/measurements");
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{garmentTypeName}</Text>

      <Text style={styles.label}>Label</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} />

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

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.saveButton, pending && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={pending}
        >
          <Text style={styles.saveButtonText}>
            {pending ? "Saving..." : "Save changes"}
          </Text>
        </Pressable>
        <Pressable style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 24,
    padding: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: "#4f46e5",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  deleteButtonText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
});
