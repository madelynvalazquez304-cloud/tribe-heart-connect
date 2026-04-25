// Admin-only: send a custom email to a target audience (all users, creators
// only, or a custom list of addresses). Uses the admin_custom template via
// the configured SMTP. Sends sequentially with a small delay to avoid
// overwhelming the SMTP relay.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Audience = "all" | "creators" | "users" | "custom";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await supabase.auth.getClaims(token);
    const uid = (claims as any)?.claims?.sub;
    if (!uid) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: uid });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audience = "all", recipients = [], subject, message_html } =
      (await req.json()) as { audience?: Audience; recipients?: string[]; subject: string; message_html: string };

    if (!subject || !message_html) {
      return new Response(JSON.stringify({ error: "subject and message_html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let targets: { email: string; name?: string }[] = [];

    if (audience === "custom") {
      targets = recipients
        .filter((r) => typeof r === "string" && r.includes("@"))
        .map((email) => ({ email }));
    } else if (audience === "creators") {
      const { data } = await supabase
        .from("creators")
        .select("display_name, profiles:user_id(email, full_name)")
        .eq("status", "approved");
      targets = (data ?? [])
        .map((r: any) => ({ email: r?.profiles?.email, name: r?.profiles?.full_name || r?.display_name }))
        .filter((r) => !!r.email);
    } else {
      // all or users
      const { data } = await supabase.from("profiles").select("email, full_name");
      targets = (data ?? [])
        .map((r: any) => ({ email: r.email, name: r.full_name }))
        .filter((r) => !!r.email);
    }

    // de-dupe
    const seen = new Set<string>();
    targets = targets.filter((t) => {
      const k = t.email.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    let sent = 0, failed = 0;
    for (const t of targets) {
      try {
        const { data, error } = await supabase.functions.invoke("send-notification", {
          body: {
            event_type: "admin_custom",
            channel: "email",
            recipient: t.email,
            data: {
              subject,
              message_html,
              recipient_name: t.name || t.email.split("@")[0],
            },
          },
        });
        if (error || (data as any)?.error) failed++;
        else sent++;
      } catch {
        failed++;
      }
      // small delay between sends to be SMTP-friendly
      await new Promise((r) => setTimeout(r, 250));
    }

    return new Response(JSON.stringify({ ok: true, total: targets.length, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-bulk-email", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});