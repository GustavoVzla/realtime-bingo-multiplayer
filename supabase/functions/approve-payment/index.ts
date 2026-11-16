// Supabase Edge Function: Approve Payment
// Handles payment approval and card assignment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId, approved, adminNotes } = await req.json();

    if (!paymentId) {
      throw new Error('Payment ID is required');
    }

    // Get payment transaction
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment not found');
    }

    if (approved) {
      // Approve payment and assign cards
      const { error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Assign cards to player
      const { error: cardsError } = await supabaseClient
        .from('bingo_cards')
        .update({ player_id: payment.player_id })
        .in('id', payment.card_ids);

      if (cardsError) throw cardsError;

      // Trigger N8N webhook for WhatsApp notification
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      if (n8nWebhookUrl) {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment_approved',
            paymentId,
            playerId: payment.player_id,
            sessionId: payment.session_id,
            cardIds: payment.card_ids,
          }),
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment approved and cards assigned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // Reject payment
      const { error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Trigger N8N webhook for rejection notification
      const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
      if (n8nWebhookUrl) {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'payment_rejected',
            paymentId,
            playerId: payment.player_id,
            adminNotes,
          }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Payment rejected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
