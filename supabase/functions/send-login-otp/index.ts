// Sends a 6-digit login OTP via the project's existing custom SMTP / notification
// pipeline (`two_factor_code` template). Avoids Supabase's default magic-link
// email which only renders a clickable link, not the actual code.
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
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normEmail = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the user by email — only existing users may sign in via OTP.
    const { data: prof } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .ilike("email", normEmail)
      .maybeSingle();
    if (!prof?.user_id) {
      // Don't leak existence — pretend success.
      return new Response(JSON.stringify({ ok: true, sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cooldown — 30s default.
    const { data: latest } = await supabase
      .from("email_2fa_codes")
      .select("created_at, consumed_at")
      .eq("user_id", prof.user_id)
      .eq("purpose", "email_login")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest && !latest.consumed_at) {
      const ageMs = Date.now() - new Date(latest.created_at).getTime();
      if (ageMs < 30_000) {
        const wait = Math.ceil((30_000 - ageMs) / 1000);
        return new Response(JSON.stringify({
          ok: false, code: "cooldown", retry_after: wait,
          error: `Please wait ${wait}s before requesting another code.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await supabase.from("email_2fa_codes").insert({
      user_id: prof.user_id, email: normEmail, code_hash, purpose: "email_login", expires_at,
    });
    if (insErr) throw insErr;

    await supabase.functions.invoke("send-notification", {
      body: {
        event_type: "two_factor_code",
        channel: "email",
        recipient: normEmail,
        data: {
          code,
          recipient_name: prof.full_name || "there",
          site_url: req.headers.get("origin") || undefined,
        },
      },
    });

    return new Response(JSON.stringify({ ok: true, expires_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-login-otp", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});