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

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  encryption: "tls" | "ssl" | "none";
}

function normalizeSmtpConfig(rows: any[]): SmtpConfig {
  const storedConfig = rows.find((r) => r.key === "smtp_config")?.value;
  const source = storedConfig && typeof storedConfig === "object"
    ? storedConfig
    : Object.fromEntries((rows ?? []).map((row) => [row.key, row.value]));

  const rawEncryption = String(source.encryption ?? source.smtp_encryption ?? "tls").toLowerCase();
  const encryption: SmtpConfig["encryption"] = rawEncryption === "ssl" || rawEncryption === "none" ? rawEncryption : "tls";
  const rawPort = Number(source.port ?? source.smtp_port);
  let port = Number.isFinite(rawPort) && rawPort > 0
    ? rawPort
    : encryption === "ssl"
      ? 465
      : encryption === "none"
        ? 25
        : 587;

  if (encryption === "ssl" && port === 587) port = 465;
  if (encryption === "tls" && port === 465) port = 587;

  const username = String(source.username ?? source.smtp_username ?? "").trim();

  return {
    enabled: !(source.enabled === false || source.smtp_enabled === false || source.enabled === "false" || source.smtp_enabled === "false"),
    host: String(source.host ?? source.smtp_host ?? "").trim(),
    port,
    username,
    password: String(source.password ?? source.smtp_password ?? ""),
    fromEmail: String(source.fromEmail ?? source.smtp_from_email ?? username).trim(),
    fromName: String(source.fromName ?? source.smtp_from_name ?? "TribeYangu").trim() || "TribeYangu",
    replyTo: String(source.replyTo ?? source.smtp_reply_to ?? "").trim(),
    encryption,
  };
}

function buildTransportCandidates(config: SmtpConfig) {
  const base = {
    host: config.host,
    auth: { user: config.username, pass: config.password },
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1",
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  };

  if (config.encryption === "ssl") {
    return [
      { ...base, port: config.port, secure: true, requireTLS: false },
      { ...base, port: 465, secure: true, requireTLS: false },
      { ...base, port: 587, secure: false, requireTLS: true },
    ];
  }

  if (config.encryption === "none") {
    return [
      { ...base, port: config.port, secure: false, requireTLS: false },
      { ...base, port: 25, secure: false, requireTLS: false },
    ];
  }

  return [
    { ...base, port: config.port, secure: false, requireTLS: true },
    { ...base, port: 587, secure: false, requireTLS: true },
    { ...base, port: 465, secure: true, requireTLS: false },
  ];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const body = (rawBody ? JSON.parse(rawBody) : {}) as Body;
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

    const config = normalizeSmtpConfig(settings ?? []);
    if (!config.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "smtp_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.host || !config.username || !config.password || !config.fromEmail) {
      return new Response(JSON.stringify({ error: "SMTP not configured. Set host, username, password, from email in admin settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = Array.isArray(body.to) ? body.to : [body.to];

    let lastError: unknown = null;
    for (const candidate of buildTransportCandidates(config)) {
      const transporter = nodemailer.createTransport(candidate);
      try {
        await transporter.sendMail({
          from: `${config.fromName} <${config.fromEmail}>`,
          to: recipients,
          subject: body.subject,
          text: body.text || body.subject,
          html: body.html,
          replyTo: body.replyTo || config.replyTo || undefined,
        });
        try { transporter.close(); } catch (_) { /* ignore */ }

        return new Response(JSON.stringify({ ok: true, connection_mode: candidate.secure ? "ssl" : candidate.requireTLS ? "tls" : "none", port: config.port }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        lastError = error;
        try { transporter.close(); } catch (_) { /* ignore */ }
      }
    }

    throw lastError ?? new Error("SMTP connection failed");
  } catch (e) {
    console.error("send-smtp-email error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});