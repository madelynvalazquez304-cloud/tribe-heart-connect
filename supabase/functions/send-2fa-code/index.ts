// Generates a 6-digit 2FA code, stores its SHA-256 hash, and emails it to the
// user via the admin-configured SMTP using the two_factor_code template.
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
    const { email, user_id, purpose = "login" } = await req.json();
    if (!email || !user_id) {
      return new Response(JSON.stringify({ error: "email and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // TTL from platform settings, default 10 min
    const { data: ttlRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "email_2fa_code_ttl_minutes")
      .maybeSingle();
    const ttl = Number((ttlRow as any)?.value ?? 10) || 10;

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + ttl * 60_000).toISOString();

    const { error: insErr } = await supabase.from("email_2fa_codes").insert({
      user_id, email, code_hash, purpose, expires_at,
    });
    if (insErr) throw insErr;

    const origin = req.headers.get("origin") || "";
    await supabase.functions.invoke("send-notification", {
      body: {
        event_type: "two_factor_code",
        channel: "email",
        recipient: email,
        data: { code, recipient_name: "there", site_url: origin || undefined },
      },
    });

    return new Response(JSON.stringify({ ok: true, expires_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-2fa-code", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});