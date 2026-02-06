import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKPushRequest {
  phone: string;
  amount: number;
  creatorId: string;
  donorName?: string;
  message?: string;
  type: 'donation' | 'vote' | 'gift' | 'campaign' | 'merchandise' | 'ticket';
  referenceId?: string;
  giftTypeId?: string;
  quantity?: number;
  campaignId?: string;
  orderId?: string;
  ticketTypeId?: string;
  ticketId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: STKPushRequest = await req.json();
    const { phone, amount, creatorId, donorName, message, type, referenceId, giftTypeId, quantity, campaignId, orderId, ticketTypeId, ticketId } = body;

    // Get active M-PESA config
    const { data: config, error: configError } = await supabase
      .from('payment_configs')
      .select('config')
      .eq('provider', 'mpesa')
      .eq('is_active', true)
      .eq('is_primary', true)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: 'M-PESA not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpesaConfig = config.config as {
      consumer_key: string;
      consumer_secret: string;
      paybill: string;
      passkey: string;
      environment: string;
    };

    // Determine base URL based on environment
    const baseUrl = mpesaConfig.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // Get OAuth token
    const auth = btoa(`${mpesaConfig.consumer_key}:${mpesaConfig.consumer_secret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get M-PESA token');
    }

    const { access_token } = await tokenResponse.json();

    // Format phone number (254...)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const password = btoa(`${mpesaConfig.paybill}${mpesaConfig.passkey}${timestamp}`);

    // Create pending record based on type
    let recordId: string;
    const platformFee = type === 'donation' || type === 'gift' || type === 'campaign' || type === 'ticket'
      ? amount * 0.05 
      : type === 'vote' 
        ? amount * 0.2 
        : amount * 0.1;
    const creatorAmount = amount - platformFee;

    if (type === 'donation') {
      const { data: donation, error } = await supabase
        .from('donations')
        .insert({
          creator_id: creatorId,
          amount,
          donor_name: donorName || null,
          donor_phone: formattedPhone,
          message: message || null,
          payment_provider: 'mpesa',
          platform_fee: platformFee,
          creator_amount: creatorAmount,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      recordId = donation.id;
    } else if (type === 'vote') {
      const { data: vote, error } = await supabase
        .from('votes')
        .insert({
          nominee_id: referenceId,
          amount_paid: amount,
          vote_count: Math.floor(amount / 10),
          voter_phone: formattedPhone,
          payment_provider: 'mpesa',
          platform_fee: platformFee,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      recordId = vote.id;
    } else if (type === 'gift') {
      const { data: gift, error } = await supabase
        .from('gifts')
        .insert({
          creator_id: creatorId,
          gift_type_id: giftTypeId,
          sender_name: donorName || null,
          sender_phone: formattedPhone,
          message: message || null,
          quantity: quantity || 1,
          total_amount: amount,
          platform_fee: platformFee,
          creator_amount: creatorAmount,
          payment_provider: 'mpesa',
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      recordId = gift.id;
    } else if (type === 'campaign') {
      const { data: contribution, error } = await supabase
        .from('campaign_contributions')
        .insert({
          campaign_id: campaignId,
          donor_name: donorName || null,
          donor_phone: formattedPhone,
          message: message || null,
          amount,
          payment_provider: 'mpesa',
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      recordId = contribution.id;
    } else if (type === 'merchandise') {
      // Update existing order status
      const { error } = await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

      if (error) throw error;
      recordId = orderId!;
    } else if (type === 'ticket') {
      // Create ticket_payment record
      const { data: ticketPayment, error } = await supabase
        .from('ticket_payments')
        .insert({
          creator_id: creatorId,
          ticket_type_id: ticketTypeId,
          buyer_name: donorName || 'Guest',
          buyer_phone: formattedPhone,
          quantity: quantity || 1,
          amount,
          platform_fee: platformFee,
          creator_amount: creatorAmount,
          payment_provider: 'mpesa',
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) throw error;
      recordId = ticketPayment.id;
    } else {
      throw new Error('Invalid payment type');
    }

    // Initiate STK Push
    const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-callback`;
    const transactionDesc = type === 'donation' ? 'TribeYangu Donation' 
      : type === 'vote' ? 'TribeYangu Vote'
      : type === 'gift' ? 'TribeYangu Gift'
      : type === 'campaign' ? 'TribeYangu Campaign'
      : type === 'ticket' ? 'TribeYangu Ticket'
      : 'TribeYangu Purchase';
    
    const stkPushBody = {
      BusinessShortCode: mpesaConfig.paybill,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: mpesaConfig.paybill,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `TY${recordId.slice(0, 8)}`,
      TransactionDesc: transactionDesc
    };

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushBody)
    });

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode === '0') {
      // Update record with checkout request ID
      const tableMap: Record<string, string> = {
        donation: 'donations',
        vote: 'votes',
        gift: 'gifts',
        campaign: 'campaign_contributions',
        merchandise: 'orders',
        ticket: 'ticket_payments'
      };
      const table = tableMap[type];
      
      await supabase
        .from(table)
        .update({ payment_reference: stkResult.CheckoutRequestID })
        .eq('id', recordId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push sent. Check your phone.',
          checkoutRequestId: stkResult.CheckoutRequestID,
          recordId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Delete the pending record (except for merchandise)
      if (type !== 'merchandise') {
        const tableMap: Record<string, string> = {
          donation: 'donations',
          vote: 'votes',
          gift: 'gifts',
          campaign: 'campaign_contributions'
        };
        const table = tableMap[type];
        await supabase.from(table).delete().eq('id', recordId);
      }

      return new Response(
        JSON.stringify({ error: stkResult.errorMessage || 'STK Push failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});