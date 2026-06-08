import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(raw: string): string {
  let p = (raw || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  else if (p.startsWith("7") || p.startsWith("1")) p = "254" + p;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { withdrawalId, override } = await req.json();
    if (!withdrawalId) {
      return new Response(JSON.stringify({ error: "withdrawalId required" }), { status: 400, headers: corsHeaders });
    }

    // Load withdrawal + creator phone
    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawals")
      .select("*, creator:creators(id, display_name, mpesa_phone)")
      .eq("id", withdrawalId)
      .maybeSingle();
    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), { status: 404, headers: corsHeaders });
    }
    if (!["pending", "approved"].includes(withdrawal.status)) {
      return new Response(JSON.stringify({ error: `Cannot send B2C for status ${withdrawal.status}` }), { status: 400, headers: corsHeaders });
    }
    if (withdrawal.payment_method !== "mpesa") {
      return new Response(JSON.stringify({ error: "Withdrawal is not M-PESA" }), { status: 400, headers: corsHeaders });
    }

    const phone = formatPhone((withdrawal.creator as any)?.mpesa_phone || (withdrawal.payment_details as any)?.phone || "");
    if (!phone || phone.length < 12) {
      return new Response(JSON.stringify({ error: "Invalid recipient phone" }), { status: 400, headers: corsHeaders });
    }

    // Auto-threshold check
    const { data: thrSetting } = await supabase.from("platform_settings").select("value").eq("key", "b2c_auto_threshold").maybeSingle();
    const threshold = Number((thrSetting?.value as any) ?? 50000);
    if (!override && Number(withdrawal.net_amount) >= threshold) {
      await supabase.from("withdrawals").update({ requires_review: true }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ error: "Amount exceeds auto-threshold. Manual override required.", requiresReview: true }), { status: 409, headers: corsHeaders });
    }

    // Load B2C config
    const { data: cfg } = await supabase
      .from("payment_configs")
      .select("config")
      .eq("provider", "mpesa")
      .eq("is_active", true)
      .eq("is_primary", true)
      .maybeSingle();
    if (!cfg?.config) {
      return new Response(JSON.stringify({ error: "M-PESA config missing" }), { status: 400, headers: corsHeaders });
    }
    const c = cfg.config as any;
    const required = ["consumer_key", "consumer_secret", "b2c_shortcode", "initiator_name", "security_credential"];
    for (const k of required) {
      if (!c[k]) return new Response(JSON.stringify({ error: `B2C config missing: ${k}` }), { status: 400, headers: corsHeaders });
    }
    const baseUrl = c.environment === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";

    // OAuth token
    const auth = btoa(`${c.consumer_key}:${c.consumer_secret}`);
    const tokRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!tokRes.ok) {
      throw new Error("Failed to get M-PESA token");
    }
    const { access_token } = await tokRes.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callback = `${supabaseUrl}/functions/v1/mpesa-b2c-result`;

    // Mark processing
    await supabase.from("withdrawals").update({
      status: "processing",
      auto_send_attempted_at: new Date().toISOString(),
      processed_by: userData.user.id,
    }).eq("id", withdrawalId);

    const b2cBody = {
      OriginatorConversationID: `TY-${withdrawalId.slice(0, 8)}-${Date.now()}`,
      InitiatorName: c.initiator_name,
      SecurityCredential: c.security_credential,
      CommandID: "BusinessPayment",
      Amount: Math.floor(Number(withdrawal.net_amount)),
      PartyA: c.b2c_shortcode,
      PartyB: phone,
      Remarks: `Withdrawal ${withdrawalId.slice(0, 8)}`,
      QueueTimeOutURL: callback,
      ResultURL: callback,
      Occasion: "Payout",
    };

    const b2cRes = await fetch(`${baseUrl}/mpesa/b2c/v3/paymentrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(b2cBody),
    });
    const result = await b2cRes.json();

    if (result.ResponseCode === "0") {
      await supabase.from("withdrawals").update({
        b2c_conversation_id: result.ConversationID,
        b2c_originator_conversation_id: result.OriginatorConversationID,
      }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ success: true, conversationId: result.ConversationID }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await supabase.from("withdrawals").update({
        status: "pending",
        b2c_result_desc: result.errorMessage || result.ResponseDescription || "B2C request failed",
      }).eq("id", withdrawalId);
      return new Response(JSON.stringify({ error: result.errorMessage || "B2C request failed", raw: result }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("b2c error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});