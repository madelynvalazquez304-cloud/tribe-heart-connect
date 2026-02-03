import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { Body } = body;

    if (!Body?.stkCallback) {
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    console.log('M-PESA Callback:', { CheckoutRequestID, ResultCode, ResultDesc });

    // Find the record by CheckoutRequestID in all possible tables
    type TableType = 'donations' | 'votes' | 'gifts' | 'campaign_contributions' | 'orders';
    const tables: TableType[] = ['donations', 'votes', 'gifts', 'campaign_contributions', 'orders'];
    let record: any = null;
    let table: TableType | null = null;

    for (const t of tables) {
      const { data } = await supabase
        .from(t)
        .select('*')
        .eq('payment_reference', CheckoutRequestID)
        .single();

      if (data) {
        record = data;
        table = t;
        break;
      }
    }

    if (!record || !table) {
      console.log('Record not found for CheckoutRequestID:', CheckoutRequestID);
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceipt = '';
      let amount = 0;

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
          if (item.Name === 'Amount') amount = item.Value;
        }
      }

      if (table === 'donations') {
        await supabase
          .from('donations')
          .update({
            status: 'completed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        // Create transaction record
        await supabase.from('transactions').insert({
          creator_id: record.creator_id,
          type: 'donation',
          amount: record.amount,
          fee: record.platform_fee,
          net_amount: record.creator_amount,
          status: 'completed',
          payment_provider: 'mpesa',
          payment_reference: mpesaReceipt,
          reference_type: 'donation',
          reference_id: record.id,
          description: `Donation from ${record.donor_name || 'Anonymous'}`
        });

        // Update creator stats
        await supabase.rpc('update_creator_donation_stats', { _donation_id: record.id });
      } else if (table === 'votes') {
        await supabase
          .from('votes')
          .update({
            status: 'confirmed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        // Update nominee vote count
        await supabase.rpc('update_nominee_votes', { _vote_id: record.id });
      } else if (table === 'gifts') {
        await supabase
          .from('gifts')
          .update({
            status: 'completed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        // Create transaction record for gift
        await supabase.from('transactions').insert({
          creator_id: record.creator_id,
          type: 'donation', // Gifts count as donations
          amount: record.total_amount,
          fee: record.platform_fee,
          net_amount: record.creator_amount,
          status: 'completed',
          payment_provider: 'mpesa',
          payment_reference: mpesaReceipt,
          reference_type: 'gift',
          reference_id: record.id,
          description: `Gift from ${record.sender_name || 'Anonymous'}`
        });
      } else if (table === 'campaign_contributions') {
        await supabase
          .from('campaign_contributions')
          .update({
            status: 'completed',
            mpesa_receipt: mpesaReceipt
          })
          .eq('id', record.id);

        // Update campaign current_amount and supporter_count
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('current_amount, supporter_count, creator_id')
          .eq('id', record.campaign_id)
          .single();

        if (campaign) {
          await supabase
            .from('campaigns')
            .update({
              current_amount: (campaign.current_amount || 0) + record.amount,
              supporter_count: (campaign.supporter_count || 0) + 1
            })
            .eq('id', record.campaign_id);

          // Create transaction record
          await supabase.from('transactions').insert({
            creator_id: campaign.creator_id,
            type: 'donation',
            amount: record.amount,
            fee: record.amount * 0.05,
            net_amount: record.amount * 0.95,
            status: 'completed',
            payment_provider: 'mpesa',
            payment_reference: mpesaReceipt,
            reference_type: 'campaign',
            reference_id: record.id,
            description: `Campaign contribution from ${record.donor_name || 'Anonymous'}`
          });
        }
      } else if (table === 'orders') {
        await supabase
          .from('orders')
          .update({
            status: 'processing',
            payment_reference: mpesaReceipt
          })
          .eq('id', record.id);

        // Create transaction record
        await supabase.from('transactions').insert({
          creator_id: record.creator_id,
          type: 'merchandise',
          amount: record.total,
          fee: record.platform_fee,
          net_amount: record.creator_amount,
          status: 'completed',
          payment_provider: 'mpesa',
          payment_reference: mpesaReceipt,
          reference_type: 'order',
          reference_id: record.id,
          description: `Order from ${record.customer_name}`
        });
      }
    } else {
      // Payment failed
      await supabase
        .from(table)
        .update({ status: 'failed' })
        .eq('id', record.id);
    }

    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  } catch (error) {
    console.error('Callback Error:', error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }));
  }
});