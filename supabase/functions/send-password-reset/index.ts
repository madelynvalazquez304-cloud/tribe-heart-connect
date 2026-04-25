// Custom SMTP-based password reset. Generates a token, stores its hash with
// the originating site URL, and emails a link that returns to the SAME origin
// the request was made from (preview vs custom domain vs lovable.app).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, origin: bodyOrigin } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the user via profiles (respects existing schema; never crashes if absent).
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .ilike("email", email)
      .maybeSingle();

    // Always respond 200 to avoid email-enumeration; only send when we have a user.
    const origin = bodyOrigin || req.headers.get("origin") || req.headers.get("referer") || "";
    let originUrl = "";
    try { originUrl = origin ? new URL(origin).origin : ""; } catch { /* ignore */ }

    if (profile?.user_id) {
      const { data: ttlRow } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "password_reset_token_ttl_minutes")
        .maybeSingle();
      const ttl = Number((ttlRow as any)?.value ?? 30) || 30;

      const token = randomToken();
      const token_hash = await sha256(token);
      const expires_at = new Date(Date.now() + ttl * 60_000).toISOString();

      await supabase.from("password_reset_tokens").insert({
        user_id: profile.user_id,
        email,
        token_hash,
        origin_url: originUrl || null,
        expires_at,
      });

      const baseUrl = originUrl || "";
      const action_url = `${baseUrl}/reset-password?token=${token}`;
      const recipient_name = (profile as any).full_name || email.split("@")[0];

      await supabase.functions.invoke("send-notification", {
        body: {
          event_type: "password_reset",
          channel: "email",
          recipient: email,
          data: {
            action_url,
            recipient_name,
            ttl_minutes: ttl,
            site_url: baseUrl || undefined,
          },
        },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-password-reset", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});