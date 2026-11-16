/**
 * GameTest Component
 * Simple test interface for the bingo game
 */

import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { BingoCard } from './BingoCard';
import { UserProfile } from './UserProfile';
import { GameEvent, BingoPattern } from '@bingo/shared-types';
import type { Room, BingoCard as BingoCardType } from '@bingo/shared-types';

export function GameTest() {
  const [socket] = useState(() => getSocket());
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on(GameEvent.ROOM_CREATED, (newRoom: Room) => {
      console.log('Room created:', newRoom);
      setRoom(newRoom);
      setRoomId(newRoom.id);
    });

    socket.on(GameEvent.ROOM_UPDATED, (updatedRoom: Room) => {
      console.log('Room updated:', updatedRoom);
      setRoom(updatedRoom);
    });

    socket.on(GameEvent.GAME_STARTED, (updatedRoom: Room) => {
      console.log('Game started:', updatedRoom);
      setRoom(updatedRoom);
    });

    socket.on(GameEvent.BALL_CALLED, ({ ball }: { ball: number }) => {
      console.log('Ball called:', ball);
      if (room) {
        setRoom((prev) =>
          prev ? { ...prev, currentBall: ball, drawnBalls: [...prev.drawnBalls, ball] } : null
        );
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off(GameEvent.ROOM_CREATED);
      socket.off(GameEvent.ROOM_UPDATED);
      socket.off(GameEvent.GAME_STARTED);
      socket.off(GameEvent.BALL_CALLED);
    };
  }, [socket, room]);

  const createRoom = () => {
    socket.emit(GameEvent.CREATE_ROOM, {
      sessionId: 'test-session-' + Date.now(),
      maxPlayers: 4,
      pattern: BingoPattern.HORIZONTAL,
    });
  };

  const joinRoom = () => {
    if (!roomId || !playerName) {
      alert('Please enter room ID and player name');
      return;
    }

    // Generate a test card in B-I-N-G-O format
    const testCard: BingoCardType = {
      id: 'card-' + Date.now(),
      sessionId: room?.sessionId || '',
      numbers: {
        B: [1, 5, 10, 14, 15],
        I: [16, 20, 25, 29, 30],
        N: [31, 35, 0, 44, 45], // 0 represents FREE
        G: [46, 50, 55, 59, 60],
        O: [61, 65, 70, 74, 75],
      },
      createdAt: new Date(),
    };

    socket.emit(GameEvent.JOIN_ROOM, {
      roomId,
      player: {
        id: 'player-' + Date.now(),
        nickname: playerName,
        cards: [testCard],
        isReady: true,
      },
    });
  };

  const startGame = () => {
    if (!room) return;
    socket.emit(GameEvent.START_GAME, {
      roomId: room.id,
      prizeAmount: 100,
    });
  };

  const drawBall = () => {
    if (!room) return;
    // Simulate ball drawing
    const availableBalls = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (ball) => !room.drawnBalls.includes(ball)
    );

    if (availableBalls.length > 0) {
      const randomBall = availableBalls[Math.floor(Math.random() * availableBalls.length)];
      socket.emit('draw_ball', { roomId: room.id, ball: randomBall });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with User Profile */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">🎯 Bingo Game Test</h1>
          <UserProfile />
        </div>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold">
              {connected ? '✅ Connected to server' : '❌ Disconnected'}
            </span>
            {connected && <span className="text-sm text-gray-600 ml-auto">{socket.id}</span>}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Controls</h2>

          {!room && (
            <div className="space-y-4">
              <button
                onClick={createRoom}
                disabled={!connected}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create New Room
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                />
                <button
                  onClick={joinRoom}
                  disabled={!connected}
                  className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  Join Room
                </button>
              </div>
            </div>
          )}

          {room && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Room ID:</span> {room.id.slice(0, 8)}...
                </div>
                <div>
                  <span className="font-semibold">Status:</span>{' '}
                  <span
                    className={`px-2 py-1 rounded ${
                      room.status === 'waiting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : room.status === 'playing'
                          ? 'bg-green-100 text-green-800'
                          : room.status === 'paused'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {room.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">Players:</span> {room.players.length}/
                  {room.maxPlayers}
                </div>
                <div>
                  <span className="font-semibold">Pattern:</span> {room.pattern}
                </div>
                <div>
                  <span className="font-semibold">Prize:</span> ${room.prizeAmount || 0}
                </div>
                <div>
                  <span className="font-semibold">Balls Drawn:</span> {room.drawnBalls.length}
                </div>
              </div>

              <div className="flex gap-2">
                {room.status === 'waiting' && (
                  <button
                    onClick={startGame}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700"
                  >
                    Start Game
                  </button>
                )}
                {room.status === 'playing' && (
                  <button
                    onClick={drawBall}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Draw Ball
                  </button>
                )}
                <button
                  onClick={() => setRoom(null)}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700"
                >
                  Leave Room
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Ball */}
        {room && room.currentBall && (
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 mb-6 text-center">
            <h3 className="text-white text-xl font-semibold mb-2">Current Ball</h3>
            <div className="bg-white rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <span className="text-5xl font-bold text-blue-600">{room.currentBall}</span>
            </div>
          </div>
        )}

        {/* Drawn Balls */}
        {room && room.drawnBalls.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Drawn Balls ({room.drawnBalls.length})</h3>
            <div className="flex flex-wrap gap-2">
              {room.drawnBalls.map((ball, idx) => (
                <div
                  key={idx}
                  className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center font-bold text-blue-700"
                >
                  {ball}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bingo Cards */}
        {room && room.players.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {room.players.map((player) =>
              player.cards.map((card) => (
                <div key={card.id}>
                  <h3 className="text-xl font-bold mb-3 text-center">{player.nickname}'s Card</h3>
                  <BingoCard
                    card={card}
                    drawnBalls={room.drawnBalls}
                    canMark={room.status === 'playing'}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
