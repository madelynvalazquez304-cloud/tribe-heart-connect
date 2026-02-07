import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { recordId, type } = await req.json();

    const tableMap: Record<string, string> = {
      donation: 'donations',
      vote: 'votes',
      gift: 'gifts',
      campaign: 'campaign_contributions',
      merchandise: 'orders',
      ticket: 'ticket_payments'
    };
    
    const table = tableMap[type];
    if (!table) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data, error } = await supabase
      .from(table)
      .select('status, mpesa_receipt, payment_reference')
      .eq('id', recordId)
      .single();

    if (error) throw error;

    // Normalize status - orders use 'processing' for successful payment
    let normalizedStatus = data.status;
    if (type === 'merchandise' && data.status === 'processing') {
      normalizedStatus = 'completed';
    }

    return new Response(
      JSON.stringify({
        status: normalizedStatus,
        receipt: data.mpesa_receipt || data.payment_reference
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});