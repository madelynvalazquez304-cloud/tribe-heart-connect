// Admin-only: send a single custom email (HTML body, free-form subject) to one
// recipient using the configured SMTP via the admin_custom template.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { recipient, subject, message_html, recipient_name } = await req.json();
    if (!recipient || !subject || !message_html) {
      return new Response(JSON.stringify({ error: "recipient, subject, message_html required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: {
        event_type: "admin_custom",
        channel: "email",
        recipient,
        data: {
          subject,
          message_html,
          recipient_name: recipient_name || recipient.split("@")[0],
        },
      },
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-custom-email", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});