/**
 * Winner Verification Socket.IO Events
 *
 * Handles real-time events for winner claims and verification:
 * - Players claim BINGO
 * - Game pauses for verification
 * - Admins receive notifications
 * - Players receive verification results
 */

import type { Server, Socket } from 'socket.io';
import { GameEvent, ClaimBingoPayload } from '@bingo/shared-types';
import { supabaseAdmin } from '../lib/supabase.js';
import { winnerVerificationService } from '../services/WinnerVerificationService.js';

/**
 * Setup winner verification Socket.IO events
 *
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO client socket
 */
export function setupWinnerEvents(io: Server, socket: Socket): void {
  /**
   * Event: Player claims BINGO
   * Flow:
   *   1. Validate claim data
   *   2. Get card and drawn balls from database
   *   3. Verify pattern match
   *   4. Create claim record in database
   *   5. Pause game
   *   6. Notify admin and players
   */
  socket.on(GameEvent.CLAIM_BINGO, async (data: ClaimBingoPayload) => {
    try {
      const { roomId, cardId, playerId } = data;
      const userId = socket.data.user?.id;

      // Verify user is authenticated
      if (!userId) {
        socket.emit(GameEvent.ERROR, {
          message: 'Authentication required to claim BINGO',
        });
        return;
      }

      // Verify user is claiming for themselves
      if (userId !== playerId) {
        socket.emit(GameEvent.ERROR, {
          message: 'You can only claim BINGO for your own cards',
        });
        return;
      }

      console.log(
        `[CLAIM_BINGO] Player ${playerId} claiming BINGO for card ${cardId} in room ${roomId}`
      );

      // Fetch card details from database
      const { data: card, error: cardError } = await supabaseAdmin
        .from('bingo_cards')
        .select(
          `
          id,
          session_id,
          player_id,
          numbers,
          created_at,
          bingo_sessions!inner (
            id,
            pattern
          )
        `
        )
        .eq('id', cardId)
        .eq('player_id', playerId)
        .single();

      if (cardError || !card) {
        socket.emit(GameEvent.ERROR, {
          message: 'Card not found or does not belong to you',
        });
        return;
      }

      // Fetch drawn balls for the session
      const { data: drawnBallsData, error: ballsError } = await supabaseAdmin
        .from('drawn_balls')
        .select('ball_number')
        .eq('session_id', card.session_id)
        .order('draw_order', { ascending: true });

      if (ballsError) {
        console.error('Error fetching drawn balls:', ballsError);
        socket.emit(GameEvent.ERROR, {
          message: 'Error fetching game data',
        });
        return;
      }

      const drawnBalls = drawnBallsData?.map((b: any) => b.ball_number) || [];

      // Verify pattern match
      const pattern = card.bingo_sessions.pattern;
      const verification = winnerVerificationService.verifyPattern(
        {
          id: card.id,
          sessionId: card.session_id,
          playerId: card.player_id,
          numbers: card.numbers as any, // JSONB format: {B: [], I: [], N: [], G: [], O: []}
          createdAt: new Date(card.created_at),
        },
        drawnBalls,
        pattern
      );

      console.log(`[CLAIM_BINGO] Verification result:`, verification);

      // If pattern doesn't match, reject immediately
      if (!verification.isValid) {
        socket.emit(GameEvent.BINGO_REJECTED, {
          message: `Invalid BINGO claim: ${verification.message}`,
          reason: 'Pattern not matched',
          missingCells: verification.missingCells,
        });
        return;
      }

      // Create claim record in database
      const { data: claim, error: claimError } = await supabaseAdmin
        .from('bingo_claims')
        .insert({
          session_id: card.session_id,
          room_id: roomId,
          player_id: playerId,
          card_id: cardId,
          claimed_pattern: pattern,
          matched_positions: verification.matchedCells,
          matched_numbers: drawnBalls,
          status: 'pending',
        })
        .select()
        .single();

      if (claimError || !claim) {
        console.error('Error creating claim:', claimError);
        socket.emit(GameEvent.ERROR, {
          message: 'Error creating claim record',
        });
        return;
      }

      // Fetch player info
      const { data: player } = await supabaseAdmin
        .from('users')
        .select('nickname, email')
        .eq('id', playerId)
        .single();

      // Pause the game
      io.to(roomId).emit(GameEvent.GAME_PAUSED, {
        reason: 'bingo_claim',
        claimId: claim.id,
        playerId,
        playerNickname: player?.nickname || 'Unknown',
        cardId,
        message: `${player?.nickname || 'A player'} has claimed BINGO! Awaiting admin verification...`,
      });

      // Notify admin namespace about new claim
      io.of('/admin').emit('winner:claim', {
        claimId: claim.id,
        roomId,
        sessionId: card.session_id,
        playerId,
        playerNickname: player?.nickname || 'Unknown',
        cardId,
        pattern,
        claimedAt: claim.claimed_at,
        autoVerification: {
          isValid: verification.isValid,
          message: verification.message,
          matchedCells: verification.matchedCells,
        },
      });

      console.log(`[CLAIM_BINGO] Claim created: ${claim.id}, game paused, admins notified`);
    } catch (error: any) {
      console.error('Error handling CLAIM_BINGO:', error);
      socket.emit(GameEvent.ERROR, {
        message: 'An error occurred while processing your claim',
      });
    }
  });

  /**
   * Event: Admin verifies BINGO claim
   * This is typically triggered via REST API (/api/admin/winners/verify)
   * but can also be done via Socket.IO for real-time admin interfaces
   */
  socket.on(
    GameEvent.VERIFY_BINGO,
    async (data: { claimId: string; approved: boolean; reason?: string }) => {
      try {
        const { claimId, approved, reason } = data;
        const adminId = socket.data.user?.id;

        // Verify user is admin
        if (!adminId) {
          socket.emit(GameEvent.ERROR, {
            message: 'Authentication required',
          });
          return;
        }

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', adminId)
          .single();

        if (!user || user.role !== 'admin') {
          socket.emit(GameEvent.ERROR, {
            message: 'Admin role required for verification',
          });
          return;
        }

        // Verify the claim
        const result = await winnerVerificationService.verifyClaim(
          claimId,
          adminId,
          approved,
          reason
        );

        // Fetch claim to get room ID
        const { data: claim } = await supabaseAdmin
          .from('bingo_claims')
          .select('room_id, player_id')
          .eq('id', claimId)
          .single();

        if (claim) {
          // Notify the room
          if (approved) {
            io.to(claim.room_id).emit(GameEvent.BINGO_VALIDATED, {
              claimId,
              playerId: claim.player_id,
              message: 'BINGO claim verified! Winner confirmed!',
            });
          } else {
            io.to(claim.room_id).emit(GameEvent.BINGO_REJECTED, {
              claimId,
              playerId: claim.player_id,
              reason: reason || 'Claim rejected by admin',
            });
          }
        }

        // Confirm to admin
        socket.emit('verify:success', result);
      } catch (error: any) {
        console.error('Error in VERIFY_BINGO:', error);
        socket.emit(GameEvent.ERROR, {
          message: error.message || 'Error verifying claim',
        });
      }
    }
  );

  /**
   * Event: Admin requests claim details for verification
   * Returns full claim data with card, balls, and auto-verification
   */
  socket.on('claim:details', async (data: { claimId: string }) => {
    try {
      const { claimId } = data;
      const adminId = socket.data.user?.id;

      // Verify admin
      if (!adminId) {
        socket.emit(GameEvent.ERROR, { message: 'Authentication required' });
        return;
      }

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', adminId)
        .single();

      if (!user || user.role !== 'admin') {
        socket.emit(GameEvent.ERROR, { message: 'Admin role required' });
        return;
      }

      // Get claim details
      const details = await winnerVerificationService.getClaimDetails(claimId);

      if (!details) {
        socket.emit(GameEvent.ERROR, { message: 'Claim not found' });
        return;
      }

      socket.emit('claim:details:response', details);
    } catch (error: any) {
      console.error('Error fetching claim details:', error);
      socket.emit(GameEvent.ERROR, {
        message: 'Error fetching claim details',
      });
    }
  });
}

export default setupWinnerEvents;
