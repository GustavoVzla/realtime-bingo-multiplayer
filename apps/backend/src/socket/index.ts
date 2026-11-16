import type { Server } from 'socket.io';
import { GameEvent, type EndGamePayload, type Player } from '@bingo/shared-types';
import { gameManager } from '../services/GameManager.js';
import { NotificationService } from '../services/NotificationService.js';
import { WinnerVerificationService } from '../services/WinnerVerificationService.js';
import { supabaseAdmin } from '../lib/supabase.js';

export function setupSocketHandlers(io: Server) {
  // Attach Socket.IO instance to GameManager for event emission
  gameManager.setSocketIO(io);

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on(GameEvent.CREATE_ROOM, async (data) => {
      try {
        const room = gameManager.createRoom(data.sessionId, data.maxPlayers, data.pattern);
        socket.join(room.id); // Automatically join the creator to the room

        // Save room_id to database for player discovery
        await supabaseAdmin
          .from('bingo_sessions')
          .update({ room_id: room.id })
          .eq('id', data.sessionId);

        socket.emit(GameEvent.ROOM_CREATED, room);
        console.log(`Room created: ${room.id} for session: ${data.sessionId}`);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: 'Failed to create room' });
      }
    });

    socket.on(GameEvent.JOIN_ROOM, async (data) => {
      try {
        const { roomId, player } = data;

        // Check if player already exists in room (prevent duplicates)
        const room = gameManager.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const existingPlayer = room.players.find((p) => p.id === player.id);
        if (existingPlayer) {
          console.log(`⚠️ Player ${player.id} already in room ${roomId}, skipping duplicate join`);
          socket.join(roomId);
          socket.emit(GameEvent.ROOM_UPDATED, room);
          return;
        }

        // Fetch player's purchased cards from database
        const { data: cards, error: cardsError } = await supabaseAdmin
          .from('bingo_cards')
          .select('id, numbers, card_number, session_id')
          .eq('player_id', player.id)
          .eq('session_id', room.sessionId);

        if (cardsError) {
          console.error('Error fetching player cards:', cardsError);
          socket.emit('error', { message: 'Failed to load player cards' });
          return;
        }

        // Create player object with cards
        const playerWithCards: Player = {
          ...player,
          cards: (cards || []).map((card: any) => ({
            id: card.id,
            sessionId: card.session_id,
            numbers: card.numbers,
            createdAt: new Date(),
          })),
        };

        const success = await gameManager.addPlayerToRoom(roomId, playerWithCards);
        if (success) {
          socket.join(roomId);
          io.to(roomId).emit(GameEvent.ROOM_UPDATED, gameManager.getRoom(roomId));
          console.log(
            `✅ Player ${player.id} joined room ${roomId} with ${playerWithCards.cards.length} cards`
          );
        } else {
          socket.emit('error', { message: 'Failed to join room (room full or not found)' });
        }
      } catch (error) {
        console.error('Error in JOIN_ROOM:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on(GameEvent.START_GAME, async (data) => {
      try {
        // Validate room can start (checks is_active status)
        const { data: validation, error } = await supabaseAdmin.rpc('can_start_game', {
          p_room_id: data.roomId,
        });

        if (error) {
          console.error('Error validating game start:', error);
          socket.emit('error', { message: 'Failed to validate game start' });
          return;
        }

        if (!validation || !validation.can_start) {
          const reason = validation?.reason || 'Room is not active';
          console.log(`⚠️ Cannot start game: ${reason}`);
          socket.emit('error', { message: reason });
          return;
        }

        // All checks passed, start the game
        gameManager.startGame(data.roomId, data.prizeAmount);
        io.to(data.roomId).emit(GameEvent.GAME_STARTED, gameManager.getRoom(data.roomId));
        console.log(`✅ Game started in room ${data.roomId} - ${validation.current_players} players`);
      } catch (error) {
        console.error('Error in START_GAME:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    socket.on(GameEvent.DRAW_BALL, async (data) => {
      console.log('🎯 DRAW_BALL event received', { roomId: data.roomId, socketId: socket.id });

      // Admin joins room to receive ball events
      socket.join(data.roomId);

      const ball = await gameManager.drawBall(data.roomId);
      if (ball) {
        console.log('✅ Ball drawn successfully:', ball);
        io.to(data.roomId).emit(GameEvent.BALL_CALLED, { roomId: data.roomId, ball });
      } else {
        console.log('⚠️ Failed to draw ball for room:', data.roomId);
      }
    });

    // Start automatic ball drawing
    socket.on(GameEvent.START_AUTO_DRAW, (data) => {
      try {
        const { roomId, intervalSeconds } = data;

        // Admin joins room to receive broadcasts
        socket.join(roomId);
        console.log(`👨‍💼 Admin ${socket.id} joined room ${roomId} for auto-draw control`);

        const success = gameManager.startAutoDraw(roomId, intervalSeconds || 5);

        if (success) {
          const room = gameManager.getRoom(roomId);
          io.to(roomId).emit(GameEvent.AUTO_DRAW_STARTED, {
            roomId,
            autoDrawEnabled: true,
            intervalSeconds: intervalSeconds || 5,
          });
          io.to(roomId).emit(GameEvent.ROOM_UPDATED, room);
          console.log(`✅ Auto draw started for room ${roomId}`);
        } else {
          socket.emit('error', { message: 'Failed to start auto draw' });
        }
      } catch (error) {
        console.error('Error starting auto draw:', error);
        socket.emit('error', { message: 'Failed to start auto draw' });
      }
    });

    // Stop automatic ball drawing
    socket.on(GameEvent.STOP_AUTO_DRAW, (data) => {
      try {
        const { roomId } = data;
        const success = gameManager.stopAutoDraw(roomId);

        if (success) {
          const room = gameManager.getRoom(roomId);
          io.to(roomId).emit(GameEvent.AUTO_DRAW_STOPPED, {
            roomId,
            autoDrawEnabled: false,
          });
          io.to(roomId).emit(GameEvent.ROOM_UPDATED, room);
          console.log(`✅ Auto draw stopped for room ${roomId}`);
        } else {
          socket.emit('error', { message: 'Failed to stop auto draw' });
        }
      } catch (error) {
        console.error('Error stopping auto draw:', error);
        socket.emit('error', { message: 'Failed to stop auto draw' });
      }
    });

    // Player claims BINGO
    socket.on(GameEvent.CLAIM_BINGO, async (data) => {
      try {
        const { roomId, playerId, cardId, sessionId } = data;

        // Pause game immediately
        const room = gameManager.getRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Get player info
        const { data: player } = await supabaseAdmin
          .from('users')
          .select('nickname')
          .eq('id', playerId)
          .single();

        // Create claim in database
        const { data: claim, error } = await supabaseAdmin
          .from('bingo_claims')
          .insert({
            session_id: sessionId,
            room_id: roomId,
            player_id: playerId,
            card_id: cardId,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        // Broadcast game pause to all players
        io.to(roomId).emit(GameEvent.GAME_PAUSED, {
          claimId: claim.id,
          playerId,
          playerNickname: player?.nickname || 'Player',
          cardId,
        });

        // Notify all admins
        await NotificationService.notifyAllAdmins(
          'bingo_claimed',
          'New BINGO Claim',
          `${player?.nickname || 'Player'} claimed BINGO in room ${roomId}`,
          { claimId: claim.id, roomId, playerId, cardId }
        );

        console.log(`BINGO claimed by ${playerId} in room ${roomId}, claim ID: ${claim.id}`);
      } catch (error) {
        console.error('Error processing BINGO claim:', error);
        socket.emit('error', { message: 'Failed to process BINGO claim' });
      }
    });

    // Admin verifies BINGO claim (called via REST API, but we broadcast the result here)
    socket.on(GameEvent.VERIFY_BINGO, async (data) => {
      try {
        const { claimId, approved, roomId } = data;

        if (approved) {
          // Get full claim details for validation broadcast
          const verificationService = new WinnerVerificationService();
          const claimDetails = await verificationService.getClaimDetails(claimId);

          io.to(roomId).emit(GameEvent.BINGO_VALIDATED, {
            claimId,
            claimDetails,
          });

          console.log(`BINGO claim ${claimId} validated for room ${roomId}`);
        } else {
          // Claim rejected, resume game
          io.to(roomId).emit(GameEvent.BINGO_REJECTED, {
            claimId,
            message: 'Claim was invalid. Game resumed.',
          });

          console.log(`BINGO claim ${claimId} rejected for room ${roomId}`);
        }
      } catch (error) {
        console.error('Error verifying BINGO:', error);
        socket.emit('error', { message: 'Failed to verify BINGO' });
      }
    });

    // Admin ends game
    socket.on(GameEvent.GAME_ENDED, async (payload: EndGamePayload) => {
      try {
        const { roomId, sessionId, reason, winners } = payload;

        // Update game room status in database
        await supabaseAdmin
          .from('game_rooms')
          .update({
            status: 'finished',
            updated_at: new Date().toISOString(),
          })
          .eq('id', roomId);

        // Update session status in database and clear room_id
        await supabaseAdmin
          .from('bingo_sessions')
          .update({
            status: reason === 'completed' ? 'completed' : 'cancelled',
            ended_at: new Date().toISOString(),
            room_id: null, // Clear room_id when game ends
          })
          .eq('id', sessionId);

        // Broadcast game end to all players
        io.to(roomId).emit(GameEvent.GAME_ENDED, {
          reason,
          winners,
          message:
            reason === 'completed'
              ? 'Game completed successfully!'
              : reason === 'cancelled'
                ? 'Game was cancelled by admin'
                : 'Game ended due to timeout',
        });

        // Clean up room from memory
        gameManager.removeRoom(roomId);

        // Notify admins
        await NotificationService.notifyAllAdmins(
          'game_ended',
          'Game Ended',
          `Game in room ${roomId} ended (${reason})`,
          { roomId, sessionId, reason, winnersCount: winners?.length || 0 }
        );

        console.log(`Game ended in room ${roomId} - Reason: ${reason}`);
      } catch (error) {
        console.error('Error ending game:', error);
        socket.emit('error', { message: 'Failed to end game' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
