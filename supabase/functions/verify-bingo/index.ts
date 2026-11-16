// Supabase Edge Function: Verify Bingo
// Server-side bingo pattern validation

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BingoCard {
  id: string;
  numbers: number[][];
}

function checkBingoPattern(card: BingoCard, drawnBalls: number[], pattern: string): boolean {
  const { numbers } = card;
  const drawnSet = new Set(drawnBalls);

  // Helper: check if number is marked
  const isMarked = (row: number, col: number): boolean => {
    // Center cell (FREE space) is always marked
    if (row === 2 && col === 2) return true;
    return drawnSet.has(numbers[row][col]);
  };

  switch (pattern) {
    case 'horizontal':
      return numbers.some((row) => row.every((num, col) => isMarked(numbers.indexOf(row), col)));

    case 'vertical':
      for (let col = 0; col < 5; col++) {
        if (numbers.every((_, row) => isMarked(row, col))) return true;
      }
      return false;

    case 'diagonal':
      const diag1 = [0, 1, 2, 3, 4].every((i) => isMarked(i, i));
      const diag2 = [0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i));
      return diag1 || diag2;

    case 'four_corners':
      return isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4);

    case 'full_card':
      return numbers.every((row, r) => row.every((_, c) => isMarked(r, c)));

    case 'X':
      return (
        [0, 1, 2, 3, 4].every((i) => isMarked(i, i)) &&
        [0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i))
      );

    case 'L':
      const leftCol = numbers.every((_, row) => isMarked(row, 0));
      const bottomRow = numbers[4].every((_, col) => isMarked(4, col));
      return leftCol && bottomRow;

    default:
      return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, cardId, playerId } = await req.json();

    // Get session with pattern
    const { data: session, error: sessionError } = await supabaseClient
      .from('bingo_sessions')
      .select('pattern')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get card
    const { data: card, error: cardError } = await supabaseClient
      .from('bingo_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      throw new Error('Card not found');
    }

    // Get drawn balls
    const { data: balls, error: ballsError } = await supabaseClient
      .from('drawn_balls')
      .select('ball_number')
      .eq('session_id', sessionId)
      .order('draw_order', { ascending: true });

    if (ballsError) throw ballsError;

    const drawnBalls = balls?.map((b) => b.ball_number) || [];

    // Verify bingo
    const isValid = checkBingoPattern(card, drawnBalls, session.pattern);

    if (isValid) {
      // Calculate prize share
      const { data: existingWinners } = await supabaseClient
        .from('winners')
        .select('id')
        .eq('session_id', sessionId);

      const winnerCount = (existingWinners?.length || 0) + 1;
      const prizeShare = session.prize_amount ? session.prize_amount / winnerCount : 0;

      // Record winner
      const { error: winnerError } = await supabaseClient.from('winners').insert({
        session_id: sessionId,
        player_id: playerId,
        card_id: cardId,
        prize_share: prizeShare,
      });

      if (winnerError) throw winnerError;

      return new Response(JSON.stringify({ success: true, valid: true, prizeShare }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      return new Response(
        JSON.stringify({ success: true, valid: false, message: 'Pattern not complete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
