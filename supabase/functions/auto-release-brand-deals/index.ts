import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: due } = await supabase
      .from("brand_deals")
      .select("id, auto_release_at, brand_approved_at, released_at, payment_status")
      .lte("auto_release_at", new Date().toISOString())
      .is("released_at", null)
      .eq("payment_status", "funded");
    let released = 0;
    for (const d of due || []) {
      const { error } = await supabase.rpc("release_brand_deal", { _deal_id: d.id });
      if (!error) released++;
    }
    return new Response(JSON.stringify({ ok: true, released }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});