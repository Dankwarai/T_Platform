// Paystack calls this directly (no Supabase JWT — verify_jwt = false for
// this function in config.toml) whenever a transaction's status changes.
// Authenticity is instead verified via the x-paystack-signature header:
// an HMAC-SHA512 of the raw request body, keyed with the same secret used
// to initialize the transaction. The signature must be computed over the
// raw bytes before any JSON parsing — re-serializing a parsed body isn't
// guaranteed to byte-match what Paystack signed.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

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

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  const signatureBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const valid =
    signatureBuf.length === expectedBuf.length &&
    timingSafeEqual(signatureBuf, expectedBuf);

  if (!valid) {
    return json({ error: "Invalid signature" }, 401);
  }

  const event = JSON.parse(rawBody);
  if (event.event !== "charge.success") {
    // Ack anything we don't act on so Paystack doesn't keep retrying it.
    return json({ received: true });
  }

  const reference: string = event.data.reference;
  const providerStatus: string = event.data.status;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: payment } = await adminClient
    .from("payments")
    .select("id, status, target_type, job_id, order_id")
    .eq("provider_reference", reference)
    .single();

  if (!payment) {
    // Unknown reference — nothing in our system to reconcile. Ack anyway
    // so Paystack doesn't retry indefinitely.
    return json({ received: true });
  }
  if (payment.status === "paid") {
    // Already processed — Paystack retries webhooks, this must be a no-op.
    return json({ received: true });
  }

  const newStatus = providerStatus === "success" ? "paid" : "failed";

  await adminClient
    .from("payments")
    .update({ status: newStatus })
    .eq("id", payment.id);

  if (newStatus === "paid") {
    if (payment.target_type === "job") {
      // Jobs pay in two legs (deposit, then remainder) — this webhook
      // fires once per successful charge, so step the job's own status
      // forward by one stage rather than jumping straight to "paid".
      // initialize-payment already refuses to start a new charge once
      // the job is fully paid, so there's no risk of overshooting past it.
      const { data: job } = await adminClient
        .from("jobs")
        .select("payment_status")
        .eq("id", payment.job_id)
        .single();

      const nextStatus = job?.payment_status === "deposit_paid" ? "paid" : "deposit_paid";

      await adminClient
        .from("jobs")
        .update({ payment_status: nextStatus })
        .eq("id", payment.job_id);
    } else {
      await adminClient
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", payment.order_id);
    }
  }

  return json({ received: true });
});
