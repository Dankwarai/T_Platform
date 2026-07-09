import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../contexts/auth-context";
import { PayButton } from "../../components/PayButton";
import { supabase } from "../../lib/supabase";

type Job = {
  id: string;
  status: string;
  price: number | null;
  price_type: string | null;
  payment_status: string;
  payment_method: string | null;
  due_date: string | null;
  fitting_iteration_count: number;
  fit_confirmation: string | null;
  tailor_id: string;
  garment_type_id: string;
  tailor_profiles: { user_id: string; business_name: string } | null;
  garment_types: { name: string } | null;
  measurement_records: {
    label: string;
    customer_profiles: {
      user_id: string;
      users: { full_name: string } | null;
    } | null;
  } | null;
};

type HistoryEntry = {
  from_status: string | null;
  to_status: string;
  created_at: string;
};

// CONCEPT.md flagged unlimited fitting_iteration_count as a risk of
// stalling a job indefinitely. Once this many adjustment rounds have
// happened, the next fitting outcome finalizes the job instead of
// looping back to another round — a poor fit_confirmation still drags
// down the tailor's skill score, so the incentive to get it right within
// the cap stays intact.
const FITTING_ADJUSTMENT_CAP = 3;

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "payment pending",
  deposit_paid: "deposit paid, balance due",
  paid: "paid",
};

const STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  accepted: "Accepted",
  rejected: "Rejected",
  in_progress: "In progress",
  ready_for_fitting: "Ready for fitting",
  adjusting: "Adjusting",
  completed: "Completed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [standardPrice, setStandardPrice] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [useStandard, setUseStandard] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;

    const { data: jobData } = await supabase
      .from("jobs")
      .select(
        "id, status, price, price_type, payment_status, payment_method, due_date, fitting_iteration_count, fit_confirmation, tailor_id, garment_type_id, tailor_profiles(user_id, business_name), garment_types(name), measurement_records(label, customer_profiles(user_id, users(full_name)))",
      )
      .eq("id", id)
      .single();

    setJob(jobData as unknown as Job);

    if (jobData) {
      const { data: priceData } = await supabase
        .from("tailor_service_prices")
        .select("price")
        .eq("tailor_id", jobData.tailor_id)
        .eq("garment_type_id", jobData.garment_type_id)
        .maybeSingle();
      setStandardPrice(priceData?.price ?? null);
    }

    const { data: historyData } = await supabase
      .from("job_status_history")
      .select("from_status, to_status, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true });
    setHistory(historyData ?? []);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateJob(fields: Record<string, unknown>) {
    setPending(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("jobs")
      .update(fields)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    await load();
    setPending(false);
  }

  async function handleAccept() {
    const price = useStandard ? standardPrice : Number(priceInput);
    if (price === null || Number.isNaN(price)) {
      setError("Enter a price.");
      return;
    }
    await updateJob({
      status: "accepted",
      price,
      price_type: useStandard ? "standard" : "custom",
    });
  }

  async function handleFitConfirmation(value: "yes" | "somewhat" | "no") {
    if (!job) return;
    const cappedOut = job.fitting_iteration_count >= FITTING_ADJUSTMENT_CAP;
    if (value === "yes" || cappedOut) {
      await updateJob({
        status: "completed",
        fit_confirmation: value,
        completed_at: new Date().toISOString(),
      });
    } else {
      await updateJob({
        status: "adjusting",
        fit_confirmation: value,
        fitting_iteration_count: job.fitting_iteration_count + 1,
      });
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <Text>Job not found.</Text>
      </View>
    );
  }

  const isTailor = job.tailor_profiles?.user_id === user?.id;
  const isCustomer =
    job.measurement_records?.customer_profiles?.user_id === user?.id;
  const counterpartName = isTailor
    ? job.measurement_records?.customer_profiles?.users?.full_name
    : job.tailor_profiles?.business_name;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {job.measurement_records?.label} · {job.garment_types?.name}
      </Text>
      <Text style={styles.meta}>
        {isTailor ? "Customer" : "Tailor"}: {counterpartName ?? "Unknown"}
      </Text>
      <Text style={styles.meta}>
        Status: {STATUS_LABELS[job.status] ?? job.status}
        {job.due_date ? ` · due ${job.due_date}` : ""}
      </Text>
      {job.price !== null && (
        <Text style={styles.meta}>
          Price: {job.price} ({job.price_type}) ·{" "}
          {PAYMENT_STATUS_LABELS[job.payment_status] ?? job.payment_status}
        </Text>
      )}
      {isCustomer && (
        <PayButton
          targetType="job"
          targetId={job.id}
          paymentMethod={job.payment_method}
          paymentStatus={job.payment_status}
          onPaid={load}
        />
      )}
      {job.fitting_iteration_count > 0 && (
        <Text style={styles.meta}>
          Fitting adjustments so far: {job.fitting_iteration_count}
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {job.status === "requested" && isTailor && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Accept this request</Text>
          {standardPrice !== null && (
            <Pressable
              style={styles.radioRow}
              onPress={() => setUseStandard(true)}
            >
              <Text>
                {useStandard ? "◉" : "○"} Use standard price ({standardPrice})
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.radioRow}
            onPress={() => setUseStandard(false)}
          >
            <Text>{!useStandard ? "◉" : "○"} Custom price</Text>
          </Pressable>
          {!useStandard && (
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={priceInput}
              onChangeText={setPriceInput}
            />
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={handleAccept}
              disabled={pending}
            >
              <Text style={styles.primaryButtonText}>Accept</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.dangerButton]}
              onPress={() => updateJob({ status: "rejected" })}
              disabled={pending}
            >
              <Text style={styles.dangerButtonText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      )}

      {job.status === "requested" && isCustomer && (
        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={() => updateJob({ status: "cancelled" })}
          disabled={pending}
        >
          <Text style={styles.dangerButtonText}>Cancel request</Text>
        </Pressable>
      )}

      {job.status === "accepted" && isTailor && (
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => updateJob({ status: "in_progress" })}
          disabled={pending}
        >
          <Text style={styles.primaryButtonText}>Start work</Text>
        </Pressable>
      )}
      {job.status === "accepted" && isCustomer && (
        <Pressable
          style={[styles.button, styles.dangerButton]}
          onPress={() => updateJob({ status: "cancelled" })}
          disabled={pending}
        >
          <Text style={styles.dangerButtonText}>Cancel</Text>
        </Pressable>
      )}

      {job.status === "in_progress" && isTailor && (
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => updateJob({ status: "ready_for_fitting" })}
          disabled={pending}
        >
          <Text style={styles.primaryButtonText}>Mark ready for fitting</Text>
        </Pressable>
      )}

      {job.status === "ready_for_fitting" && (isTailor || isCustomer) && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>How did the fitting go?</Text>
          {job.fitting_iteration_count >= FITTING_ADJUSTMENT_CAP && (
            <Text style={styles.meta}>
              Adjustment limit reached — any response now will mark this job
              completed.
            </Text>
          )}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.primaryButton, styles.flexButton]}
              onPress={() => handleFitConfirmation("yes")}
              disabled={pending}
            >
              <Text style={styles.primaryButtonText}>Fits well</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.flexButton]}
              onPress={() => handleFitConfirmation("somewhat")}
              disabled={pending}
            >
              <Text>Needs adjustment</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.flexButton]}
              onPress={() => handleFitConfirmation("no")}
              disabled={pending}
            >
              <Text>Doesn&apos;t fit</Text>
            </Pressable>
          </View>
        </View>
      )}

      {job.status === "adjusting" && isTailor && (
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => updateJob({ status: "ready_for_fitting" })}
          disabled={pending}
        >
          <Text style={styles.primaryButtonText}>Mark adjustments done</Text>
        </Pressable>
      )}

      {job.status === "completed" && isTailor && (
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => updateJob({ status: "delivered" })}
          disabled={pending}
        >
          <Text style={styles.primaryButtonText}>Mark delivered</Text>
        </Pressable>
      )}

      <View style={styles.historySection}>
        <Text style={styles.actionTitle}>History</Text>
        {history.map((h, i) => (
          <Text key={i} style={styles.historyItem}>
            {h.from_status
              ? `${STATUS_LABELS[h.from_status] ?? h.from_status} → ${STATUS_LABELS[h.to_status] ?? h.to_status}`
              : `Created as ${STATUS_LABELS[h.to_status] ?? h.to_status}`}
            {" — "}
            {new Date(h.created_at).toLocaleString()}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 8,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  meta: {
    color: "#666",
  },
  error: {
    color: "#dc2626",
  },
  actionBox: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  actionTitle: {
    fontWeight: "600",
  },
  radioRow: {
    paddingVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  dangerButton: {
    borderColor: "#dc2626",
  },
  dangerButtonText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  historySection: {
    marginTop: 16,
    gap: 4,
  },
  historyItem: {
    color: "#666",
    fontSize: 13,
  },
});
