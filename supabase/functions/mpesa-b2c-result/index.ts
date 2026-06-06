import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    console.log("B2C callback:", JSON.stringify(body));
    const result = body?.Result;
    if (!result) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }
    const conversationId = result.ConversationID;
    const originator = result.OriginatorConversationID;
    const resultCode = String(result.ResultCode ?? "");
    const resultDesc = result.ResultDesc || "";

    // Find withdrawal
    let { data: w } = await supabase.from("withdrawals").select("*").eq("b2c_conversation_id", conversationId).maybeSingle();
    if (!w && originator) {
      const r2 = await supabase.from("withdrawals").select("*").eq("b2c_originator_conversation_id", originator).maybeSingle();
      w = r2.data;
    }
    if (!w) {
      console.warn("No matching withdrawal for B2C callback");
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    let receipt: string | null = null;
    const params = result?.ResultParameters?.ResultParameter || [];
    for (const p of params) {
      if (p.Key === "TransactionReceipt") receipt = String(p.Value);
    }

    if (resultCode === "0") {
      await supabase.from("withdrawals").update({
        status: "completed",
        b2c_result_code: resultCode,
        b2c_result_desc: resultDesc,
        b2c_transaction_id: receipt,
        reference: receipt,
        processed_at: new Date().toISOString(),
        b2c_raw_callback: body,
      }).eq("id", w.id);

      // Record transaction (only once)
      const { data: existing } = await supabase
        .from("transactions").select("id")
        .eq("reference_type", "withdrawal").eq("reference_id", w.id).maybeSingle();
      if (!existing) {
        await supabase.from("transactions").insert({
          creator_id: w.creator_id,
          type: "withdrawal",
          amount: w.amount,
          fee: w.fee || 0,
          net_amount: w.net_amount,
          status: "completed",
          reference_type: "withdrawal",
          reference_id: w.id,
          payment_provider: "mpesa",
          payment_reference: receipt,
          description: "M-PESA B2C payout",
        });
      }
    } else {
      await supabase.from("withdrawals").update({
        status: "pending",
        b2c_result_code: resultCode,
        b2c_result_desc: resultDesc,
        b2c_raw_callback: body,
      }).eq("id", w.id);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("b2c-result error", e);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
});