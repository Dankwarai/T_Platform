// Starts a Paystack checkout for a job or order. Callable via
// `supabase.functions.invoke("initialize-payment", { body: {...} })` from
// both web and mobile — the Authorization header is forwarded
// automatically by the client SDK, so `userClient` below sees the caller's
// own session and their existing RLS grants (jobs/orders participant
// policies) act as the authorization check for "does this row exist and
// can this caller see it at all."
//
// A second, service-role client is used only for the parts a regular
// user has no policy for: writing the `payments` row. This mirrors the
// two-client pattern already used by SECURITY DEFINER functions elsewhere
// (read with the caller's privileges to authorize, write with elevated
// privileges for the parts that are intentionally not directly writable).
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
// Overridable so tests can point this at a local mock instead of the real
// Paystack API — not used in production.
const PAYSTACK_BASE_URL =
  Deno.env.get("PAYSTACK_BASE_URL") ?? "https://api.paystack.co";

type Body = {
  targetType: "job" | "order";
  targetId: string;
  redirectUrl: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!PAYSTACK_SECRET_KEY) {
    return json({ error: "Payments are not configured on this server." }, 500);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { targetType, targetId, redirectUrl } = body;
  if (
    (targetType !== "job" && targetType !== "order") ||
    !targetId ||
    !redirectUrl
  ) {
    return json({ error: "targetType, targetId, redirectUrl are required" }, 400);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return json({ error: "Not authenticated" }, 401);
  }

  let amount: number;
  if (targetType === "job") {
    const { data: job } = await userClient
      .from("jobs")
      .select(
        "id, price, payment_status, payment_method, measurement_records(customer_profiles(user_id))",
      )
      .eq("id", targetId)
      .single();

    const payerUserId = (
      job?.measurement_records as unknown as {
        customer_profiles: { user_id: string } | null;
      } | null
    )?.customer_profiles?.user_id;

    if (!job || payerUserId !== user.id) {
      return json({ error: "Job not found" }, 404);
    }
    if (job.payment_method !== "in_app") {
      return json({ error: "This job is not set up for in-app payment." }, 400);
    }
    if (job.payment_status === "paid") {
      return json({ error: "This job is already paid." }, 400);
    }
    if (job.price === null) {
      return json({ error: "This job has no price set yet." }, 400);
    }
    amount = job.price;
  } else {
    const { data: order } = await userClient
      .from("orders")
      .select("id, total_amount, payment_status, payment_method, buyer_id")
      .eq("id", targetId)
      .single();

    if (!order || order.buyer_id !== user.id) {
      return json({ error: "Order not found" }, 404);
    }
    if (order.payment_method !== "in_app") {
      return json({ error: "This order is not set up for in-app payment." }, 400);
    }
    if (order.payment_status === "paid") {
      return json({ error: "This order is already paid." }, 400);
    }
    amount = order.total_amount;
  }

  const reference = crypto.randomUUID();

  const paystackRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(amount * 100), // Paystack expects kobo, the smallest currency unit.
      reference,
      callback_url: redirectUrl,
    }),
  });

  const paystackPayload = await paystackRes.json();
  if (!paystackRes.ok || !paystackPayload.status) {
    return json(
      { error: paystackPayload.message ?? "Failed to initialize payment." },
      502,
    );
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error: insertError } = await adminClient.from("payments").insert({
    target_type: targetType,
    job_id: targetType === "job" ? targetId : null,
    order_id: targetType === "order" ? targetId : null,
    payer_id: user.id,
    amount,
    provider_reference: reference,
    status: "pending",
  });

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  return json({
    authorization_url: paystackPayload.data.authorization_url,
    reference,
  });
});
