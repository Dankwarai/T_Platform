import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of the recovery email link (see supabase/templates/recovery.html).
// GoTrue's own default /auth/v1/verify redirect delivers tokens in a URL
// hash fragment, which a PKCE-configured client (createBrowserClient forces
// flowType "pkce") rejects with "Not a valid PKCE flow url". Verifying the
// token_hash here, server-side, sets the session cookie directly and sidesteps
// that mismatch entirely — also means the link works cross-device, since it
// doesn't depend on a PKCE code-verifier cookie from the requesting browser.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(`${origin}/reset-password`);
    }
  }

  redirect(`${origin}/login?error=invalid-reset-link`);
}
