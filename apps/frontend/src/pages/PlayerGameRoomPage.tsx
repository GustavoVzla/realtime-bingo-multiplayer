/**
 * PlayerGameRoomPage - Main gameplay interface for players
 *
 * Three views:
 * 1. Lobby - Waiting for game to start
 * 2. Active Game - Live gameplay with card marking
 * 3. Post-Game - Winner announcement and results
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BingoCard } from '../components/BingoCard';
import { socket, onReconnect } from '../lib/socket';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Room, BingoCard as BingoCardType } from '@bingo/shared-types';
import { GameEvent } from '@bingo/shared-types';

interface PlayerCard extends BingoCardType {
  player_id: string;
}

export function PlayerGameRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, session: authSession } = useAuth();

  // Room state
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player cards
  const [playerCards, setPlayerCards] = useState<PlayerCard[]>([]);

  // Game state
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  // Winner state
  const [winners, setWinners] = useState<string[]>([]);
  const [gameEnded, setGameEnded] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Fetch room data and player cards
  useEffect(() => {
    if (!sessionId || !user) return;

    const fetchRoomData = async () => {
      try {
        setLoading(true);
        const token = authSession?.access_token;

        // Get active room for session
        const roomResponse = await fetch(`${backendUrl}/api/rooms/session/${sessionId}/active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!roomResponse.ok) {
          const data = await roomResponse.json();
          throw new Error(data.error || 'Failed to get room data');
        }

        const roomData = await roomResponse.json();
        setRoom(roomData.data);

        // Fetch player's cards for this session
        const cardsResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/player-cards`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cardsResponse.ok) {
          throw new Error('Failed to fetch player cards');
        }

        const cardsData = await cardsResponse.json();
        setPlayerCards(cardsData.data || []);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching room data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load room');
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [sessionId, user, authSession, backendUrl]);

  // Load existing drawn balls from database
  useEffect(() => {
    if (!sessionId || !room) return;

    const loadExistingBalls = async () => {
      try {
        console.log(`🎲 Loading existing balls for session ${sessionId}...`);

        const { data, error } = await supabase
          .from('drawn_balls')
          .select('ball_number')
          .eq('session_id', sessionId)
          .order('draw_order', { ascending: true });

        if (error) {
          console.error('⚠️ Failed to load existing balls:', error);
          return;
        }

        if (data && data.length > 0) {
          const balls = data.map((row) => row.ball_number);
          setDrawnBalls(balls);
          setCurrentBall(balls[balls.length - 1] || null);
          console.log(`✅ Loaded ${balls.length} existing balls:`, balls);
        } else {
          console.log('ℹ️ No balls drawn yet for this session');
        }
      } catch (err) {
        console.error('⚠️ Exception loading existing balls:', err);
      }
    };

    loadExistingBalls();
  }, [sessionId, room]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!room) return;

    // Join room
    socket.emit(GameEvent.JOIN_ROOM, {
      roomId: room.id,
      player: {
        id: user?.id,
        name: user?.email || 'Player',
      },
    });

    // Listen for room updates
    socket.on(GameEvent.ROOM_UPDATED, (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    // Listen for game start
    socket.on(GameEvent.GAME_STARTED, (updatedRoom: Room) => {
      setRoom(updatedRoom);
      // Don't reset balls if already loaded from database
      // Only reset if truly starting fresh
      if (updatedRoom.drawnBalls && updatedRoom.drawnBalls.length === 0) {
        setDrawnBalls([]);
        setCurrentBall(null);
      }
    });

    // Listen for ball calls
    socket.on(GameEvent.BALL_CALLED, ({ ball }: { ball: number }) => {
      setCurrentBall(ball);
      setDrawnBalls((prev) => [...prev, ball]);
    });

    // Listen for game pause (someone claimed)
    socket.on(GameEvent.GAME_PAUSED, (data: any) => {
      setClaimMessage(`${data.playerNickname} claimed BINGO! Verifying...`);
    });

    // Listen for validated BINGO
    socket.on(GameEvent.BINGO_VALIDATED, (data: any) => {
      setClaimMessage(`${data.playerNickname} won! Congratulations!`);
      setWinners((prev) => [...prev, data.playerId]);
    });

    // Listen for rejected BINGO
    socket.on(GameEvent.BINGO_REJECTED, () => {
      setClaimMessage('Claim was invalid. Game resumed.');
      setClaiming(false);
      setTimeout(() => setClaimMessage(null), 3000);
    });

    // Listen for game end
    socket.on(GameEvent.GAME_ENDED, (data: any) => {
      setGameEnded(true);
      if (data.winners) {
        setWinners(data.winners);
      }
    });

    // Cleanup
    return () => {
      socket.off(GameEvent.ROOM_UPDATED);
      socket.off(GameEvent.GAME_STARTED);
      socket.off(GameEvent.BALL_CALLED);
      socket.off(GameEvent.GAME_PAUSED);
      socket.off(GameEvent.BINGO_VALIDATED);
      socket.off(GameEvent.BINGO_REJECTED);
      socket.off(GameEvent.GAME_ENDED);
    };
  }, [room, user]);

  // Handle automatic reconnection
  useEffect(() => {
    if (!room || !user || !sessionId) return;

    const unsubscribe = onReconnect(async () => {
      console.log('🔄 Reconnected! Rejoining room...');

      // Re-join the room after reconnection
      socket.emit(GameEvent.JOIN_ROOM, {
        roomId: room.id,
        player: {
          id: user.id,
          name: user.email || 'Player',
        },
      });

      // Reload balls from database to ensure sync
      try {
        const { data, error } = await supabase
          .from('drawn_balls')
          .select('ball_number')
          .eq('session_id', sessionId)
          .order('draw_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const balls = data.map((row) => row.ball_number);
          setDrawnBalls(balls);
          setCurrentBall(balls[balls.length - 1] || null);
          console.log(`✅ Reloaded ${balls.length} balls after reconnection`);
        }
      } catch (err) {
        console.error('⚠️ Failed to reload balls after reconnection:', err);
      }

      console.log('✅ Rejoined room successfully');
    });

    return () => unsubscribe();
  }, [room, user, sessionId]);

  // Handle BINGO claim
  const handleClaimBingo = useCallback(() => {
    if (!room || !playerCards.length || claiming) return;

    // Check if player has winning card
    const winningCard = playerCards.find((_card) => {
      // TODO: Implement pattern validation
      // For now, just claim with first card
      return true;
    });

    if (!winningCard) {
      alert('No winning card found!');
      return;
    }

    setClaiming(true);
    socket.emit(GameEvent.CLAIM_BINGO, {
      roomId: room.id,
      playerId: user?.id,
      cardId: winningCard.id,
      sessionId: sessionId,
    });

    setClaimMessage('Submitting claim...');
  }, [room, playerCards, claiming, user, sessionId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading game room...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded transition-colors">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Return to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No room found
  if (!room) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded transition-colors">
            <p className="font-bold">Game Not Started</p>
            <p>This session does not have an active game room yet.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors"
            >
              Return to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby View (waiting for game to start)
  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🎯 Game Lobby</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Waiting for game to start...</p>

            {/* Player count */}
            <div className="mb-6">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Players: {room.players.length} / {room.maxPlayers}
              </p>
            </div>

            {/* Game info */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6 transition-colors">
              <h2 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">Game Info</h2>
              <p className="text-purple-800 dark:text-purple-300">
                <span className="font-medium">Pattern:</span> {room.pattern}
              </p>
              {room.prizeAmount && (
                <p className="text-purple-800 dark:text-purple-300">
                  <span className="font-medium">Prize:</span> ${room.prizeAmount}
                </p>
              )}
            </div>

            {/* Player's cards */}
            {playerCards.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Your Cards ({playerCards.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playerCards.map((card) => (
                    <BingoCard key={card.id} card={card} drawnBalls={[]} canMark={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Post-Game View (game ended)
  if (gameEnded || room.status === 'ended') {
    const playerWon = user && winners.includes(user.id);

    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">🏆 Game Over!</h1>

            {playerWon ? (
              <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-6 transition-colors">
                <p className="font-bold text-xl">Congratulations! You won!</p>
                {room.prizeAmount && (
                  <p className="mt-2">Prize: ${room.prizeAmount / winners.length}</p>
                )}
              </div>
            ) : (
              <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded mb-6 transition-colors">
                <p className="font-bold">Game completed</p>
                <p className="mt-2">Better luck next time!</p>
              </div>
            )}

            {/* Winners list */}
            {winners.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Winners</h2>
                <ul className="list-disc list-inside">
                  {winners.map((winnerId) => (
                    <li key={winnerId} className="text-gray-700 dark:text-gray-300">
                      {winnerId === user?.id ? 'You' : `Player ${winnerId.slice(0, 8)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
            >
              Return to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Game View (playing)
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎯 Bingo Game</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Players: {room.players.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Balls Called: {drawnBalls.length}
              </div>
            </div>
          </div>

          {/* Current Ball Display */}
          <div className="mb-8 text-center">
            <div className="inline-block bg-gradient-to-br from-purple-600 to-blue-600 dark:from-purple-500 dark:to-blue-500 rounded-full w-32 h-32 flex items-center justify-center shadow-lg">
              {currentBall ? (
                <span className="text-5xl font-bold text-white">{currentBall}</span>
              ) : (
                <span className="text-xl font-medium text-white opacity-75">Waiting...</span>
              )}
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Current Ball</p>
          </div>

          {/* Claim Message */}
          {claimMessage && (
            <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded transition-colors">
              <p className="font-medium">{claimMessage}</p>
            </div>
          )}

          {/* Player's Cards */}
          {playerCards.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Cards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playerCards.map((card) => (
                  <BingoCard key={card.id} card={card} drawnBalls={drawnBalls} />
                ))}
              </div>
            </div>
          )}

          {/* Claim BINGO Button */}
          <div className="text-center mb-6">
            <button
              onClick={handleClaimBingo}
              disabled={claiming || !drawnBalls.length}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white text-xl font-bold rounded-lg hover:from-green-600 hover:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {claiming ? 'CLAIMING...' : 'CLAIM BINGO!'}
            </button>
          </div>

          {/* Drawn Balls Feed */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Called Balls ({drawnBalls.length})
            </h2>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
              {drawnBalls.map((ball, index) => (
                <div
                  key={`${ball}-${index}`}
                  className="w-12 h-12 flex items-center justify-center bg-purple-600 dark:bg-purple-500 text-white font-bold rounded-full text-sm"
                >
                  {ball}
                </div>
              ))}
              {drawnBalls.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No balls called yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
