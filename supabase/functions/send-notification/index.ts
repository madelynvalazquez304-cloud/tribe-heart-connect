// Centralised notification dispatcher. Looks up the active template for an
// event_type + channel, renders {{placeholders}}, sends via the SMTP function
// (or SMS via Africa's Talking later), and records a row in notification_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  event_type: string;
  channel?: "email" | "sms"; // default: email
  recipient: string;          // email or phone
  data?: Record<string, any>;
}

function render(tpl: string, data: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = data[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Payload;
    if (!body?.event_type || !body?.recipient) {
      return new Response(JSON.stringify({ error: "event_type and recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const channel = body.channel ?? "email";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull site defaults so templates always have site_name / site_url etc.
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("key,value")
      .in("category", ["branding", "public", "email"]);
    const sMap: Record<string, any> = {};
    (settings ?? []).forEach((r: any) => {
      sMap[r.key] = typeof r.value === "string" ? r.value : r.value;
    });

    // Pick siteUrl preferring the request origin so password reset etc. land
    // on whichever domain the app currently runs on (custom domain or preview).
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let siteUrl = sMap.site_url || "";
    try {
      if (origin) siteUrl = new URL(origin).origin;
    } catch { /* ignore */ }

    const merged: Record<string, any> = {
      site_name: sMap.site_name || "TribeYangu",
      site_url: siteUrl,
      support_email: sMap.support_email || sMap.contact_email || "support@tribeyangu.com",
      currency: "KES",
      ...(body.data || {}),
    };

    const { data: tpl, error: tErr } = await supabase
      .from("notification_templates")
      .select("id,subject,body,is_active")
      .eq("event_type", body.event_type)
      .eq("channel", channel)
      .eq("is_active", true)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!tpl) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = render(tpl.subject || "", merged);
    const html = render(tpl.body || "", merged);

    let status = "sent";
    let errorMessage: string | null = null;

    if (channel === "email") {
      const { data, error } = await supabase.functions.invoke("send-smtp-email", {
        body: { to: body.recipient, subject, html },
      });
      if (error) { status = "failed"; errorMessage = error.message; }
      else if ((data as any)?.skipped) { status = "skipped"; errorMessage = (data as any).reason; }
      else if ((data as any)?.error) { status = "failed"; errorMessage = (data as any).error; }
    } else {
      // SMS path is intentionally a no-op here; existing system handles SMS via Africa's Talking elsewhere.
      status = "skipped";
      errorMessage = "sms_not_handled_here";
    }

    await supabase.from("notification_logs").insert({
      template_id: tpl.id,
      recipient: body.recipient,
      channel,
      status,
      payload: { event_type: body.event_type, data: merged },
      error_message: errorMessage,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ ok: status === "sent", status, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-notification error", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});