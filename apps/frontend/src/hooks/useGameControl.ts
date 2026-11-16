import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { Room, GameEvent, CreateRoomPayload, StartGamePayload } from '@bingo/shared-types';

export function useGameControl() {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    // Connection status handlers
    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Room lifecycle handlers
    const handleRoomCreated = (createdRoom: Room) => {
      setRoom(createdRoom);
      setError(null);
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleGameStarted = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleBallCalled = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleGamePaused = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleGameEnded = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    // Setup listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(GameEvent.ROOM_CREATED, handleRoomCreated);
    socket.on(GameEvent.ROOM_UPDATED, handleRoomUpdated);
    socket.on(GameEvent.GAME_STARTED, handleGameStarted);
    socket.on(GameEvent.BALL_CALLED, handleBallCalled);
    socket.on(GameEvent.GAME_PAUSED, handleGamePaused);
    socket.on(GameEvent.GAME_ENDED, handleGameEnded);
    socket.on(GameEvent.ERROR, handleError);

    // Set initial connection status
    setIsConnected(socket.connected);

    // Cleanup listeners on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(GameEvent.ROOM_CREATED, handleRoomCreated);
      socket.off(GameEvent.ROOM_UPDATED, handleRoomUpdated);
      socket.off(GameEvent.GAME_STARTED, handleGameStarted);
      socket.off(GameEvent.BALL_CALLED, handleBallCalled);
      socket.off(GameEvent.GAME_PAUSED, handleGamePaused);
      socket.off(GameEvent.GAME_ENDED, handleGameEnded);
      socket.off(GameEvent.ERROR, handleError);
    };
  }, []);

  const createRoom = (sessionId: string, maxPlayers: number) => {
    const socket = getSocket();
    const payload: CreateRoomPayload = { sessionId, maxPlayers };
    socket.emit(GameEvent.CREATE_ROOM, payload);
  };

  const startGame = (prizeAmount: number) => {
    if (!room) {
      setError('No room available to start game');
      return;
    }
    const socket = getSocket();
    const payload: StartGamePayload = { roomId: room.id, prizeAmount };
    socket.emit(GameEvent.START_GAME, payload);
  };

  const drawBall = () => {
    if (!room) {
      setError('No room available to draw ball');
      return;
    }
    const socket = getSocket();
    socket.emit(GameEvent.BALL_CALLED, { roomId: room.id });
  };

  const pauseGame = () => {
    if (!room) {
      setError('No room available to pause');
      return;
    }
    const socket = getSocket();
    socket.emit(GameEvent.GAME_PAUSED, { roomId: room.id });
  };

  const endGame = () => {
    if (!room) {
      setError('No room available to end');
      return;
    }
    const socket = getSocket();
    socket.emit(GameEvent.GAME_ENDED, { roomId: room.id });
  };

  return {
    room,
    isConnected,
    error,
    createRoom,
    startGame,
    drawBall,
    pauseGame,
    endGame,
  };
}
