import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";

type MeasurementRecordOption = {
  id: string;
  label: string;
  garment_type_id: string;
  garment_types: { name: string } | null;
};

export function RequestJobForm({ tailorId }: { tailorId: string }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [records, setRecords] = useState<MeasurementRecordOption[]>([]);
  const [recordId, setRecordId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"in_app" | "offline">(
    "offline",
  );
  const [standardPrice, setStandardPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "customer") {
        setLoading(false);
        return;
      }

      const { data: customerProfile } = await supabase
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!customerProfile) {
        setLoading(false);
        return;
      }

      const { data: myRecords } = await supabase
        .from("measurement_records")
        .select("id, label, garment_type_id, garment_types(name)")
        .eq("customer_id", customerProfile.id)
        .order("created_at", { ascending: false });

      setRecords((myRecords as unknown as MeasurementRecordOption[]) ?? []);
      setVisible(true);
      setLoading(false);
    })();
  }, []);

  async function selectRecord(record: MeasurementRecordOption) {
    setRecordId(record.id);
    const { data } = await supabase
      .from("tailor_service_prices")
      .select("price")
      .eq("tailor_id", tailorId)
      .eq("garment_type_id", record.garment_type_id)
      .maybeSingle();
    setStandardPrice(data?.price ?? null);
  }

  async function handleSubmit() {
    const record = records.find((r) => r.id === recordId);
    if (!record) {
      setError("Please select a measurement record.");
      return;
    }
    setPending(true);
    setError(null);

    const { error: insertError } = await supabase.from("jobs").insert({
      measurement_record_id: record.id,
      tailor_id: tailorId,
      garment_type_id: record.garment_type_id,
      payment_method: paymentMethod,
    });

    if (insertError) {
      setError(insertError.message);
      setPending(false);
      return;
    }

    setPending(false);
    setSuccess(true);
  }

  if (loading || !visible) return null;

  if (records.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>
          Add a measurement record before requesting a job from this tailor.
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={styles.success}>
          Job requested — track it from My jobs.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request a job</Text>

      <View style={styles.optionColumn}>
        {records.map((r) => (
          <Pressable
            key={r.id}
            style={[
              styles.option,
              recordId === r.id && styles.optionSelected,
            ]}
            onPress={() => selectRecord(r)}
          >
            <Text>
              {r.label} ({r.garment_types?.name})
            </Text>
          </Pressable>
        ))}
      </View>

      {standardPrice !== null && (
        <Text style={styles.hint}>
          Standard price for this garment: {standardPrice}
        </Text>
      )}

      <View style={styles.optionRow}>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPaymentMethod("offline")}
        >
          <Text>{paymentMethod === "offline" ? "◉" : "○"} Pay offline</Text>
        </Pressable>
        <Pressable
          style={styles.radioRow}
          onPress={() => setPaymentMethod("in_app")}
        >
          <Text>{paymentMethod === "in_app" ? "◉" : "○"} Pay in-app</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.button, pending && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={pending || !recordId}
      >
        <Text style={styles.buttonText}>
          {pending ? "Sending..." : "Send request"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  title: {
    fontWeight: "600",
  },
  optionColumn: {
    gap: 6,
  },
  option: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
  },
  optionSelected: {
    borderColor: "#4f46e5",
    backgroundColor: "#e0e7ff",
  },
  hint: {
    color: "#475569",
    fontSize: 13,
  },
  optionRow: {
    flexDirection: "row",
    gap: 16,
  },
  radioRow: {
    paddingVertical: 2,
  },
  success: {
    color: "#16a34a",
  },
  error: {
    color: "#dc2626",
  },
  button: {
    backgroundColor: "#4f46e5",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
