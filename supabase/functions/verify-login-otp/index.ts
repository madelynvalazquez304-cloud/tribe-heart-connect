// Verifies a 6-digit login OTP, then mints a magic-link hashed token via the
// admin API so the client can establish a session without a password.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "email and code required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normEmail = String(email).trim().toLowerCase();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", normEmail)
      .maybeSingle();
    if (!prof?.user_id) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code_hash = await sha256(String(code).trim());
    const { data: row } = await supabase
      .from("email_2fa_codes")
      .select("id, expires_at, consumed_at")
      .eq("user_id", prof.user_id)
      .eq("purpose", "email_login")
      .eq("code_hash", code_hash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid code." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.consumed_at) {
      return new Response(JSON.stringify({ ok: false, error: "Code already used." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ ok: false, error: "Code expired. Request a new one." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("email_2fa_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // Generate a magiclink hashed token the client can verify to get a session.
    const { data: linkData, error: linkErr } = await (supabase as any).auth.admin.generateLink({
      type: "magiclink",
      email: normEmail,
    });
    if (linkErr) throw linkErr;
    const hashed_token = linkData?.properties?.hashed_token;
    if (!hashed_token) throw new Error("Could not mint session token");

    return new Response(JSON.stringify({ ok: true, email: normEmail, token: hashed_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-login-otp", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});