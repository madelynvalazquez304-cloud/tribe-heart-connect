// Low-level SMTP sender that uses the SMTP credentials configured by the admin
// in platform_settings. Supports STARTTLS (587), implicit SSL (465) and plain.
// Tolerant of shared-hosting peers via Deno's TLS implementation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  test?: boolean; // when true, will not log to notification_logs
}

function pickValue(rows: any[], key: string, fallback: any = ""): any {
  const row = rows.find((r) => r.key === key);
  if (!row) return fallback;
  const v = row.value;
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return fallback;
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.to || !body?.subject || (!body.html && !body.text)) {
      return new Response(JSON.stringify({ error: "to, subject and html|text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings, error: sErr } = await supabase
      .from("platform_settings")
      .select("key,value")
      .eq("category", "email");
    if (sErr) throw sErr;

    const enabled = pickValue(settings ?? [], "smtp_enabled", true);
    if (enabled === false || enabled === "false") {
      return new Response(JSON.stringify({ skipped: true, reason: "smtp_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const host = String(pickValue(settings ?? [], "smtp_host", ""));
    const port = Number(pickValue(settings ?? [], "smtp_port", 587)) || 587;
    const username = String(pickValue(settings ?? [], "smtp_username", ""));
    const password = String(pickValue(settings ?? [], "smtp_password", ""));
    const fromEmail = String(pickValue(settings ?? [], "smtp_from_email", username));
    const fromName = String(pickValue(settings ?? [], "smtp_from_name", "TribeYangu"));
    const replyTo = body.replyTo || String(pickValue(settings ?? [], "smtp_reply_to", ""));
    const encryption = String(pickValue(settings ?? [], "smtp_encryption", "tls")).toLowerCase();

    if (!host || !username || !password || !fromEmail) {
      return new Response(JSON.stringify({ error: "SMTP not configured. Set host, username, password, from email in admin settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build connection: implicit TLS for SSL (465), STARTTLS for tls (587), plain otherwise.
    const useImplicitTls = encryption === "ssl" || port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: useImplicitTls, // true for 465 (implicit SSL), false for 587 (STARTTLS)
      auth: { user: username, pass: password },
      requireTLS: !useImplicitTls && encryption !== "none",
      // Tolerant of shared-hosting certs (cPanel/Namecheap/Hostinger/etc.)
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1",
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    const recipients = Array.isArray(body.to) ? body.to : [body.to];

    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject: body.subject,
      text: body.text || body.subject,
      html: body.html,
      replyTo: replyTo || undefined,
    });
    try { transporter.close(); } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-smtp-email error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});