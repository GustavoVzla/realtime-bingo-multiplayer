/**
 * AdminGameControlPage - Real-time game control for administrators
 * Allows admins to monitor and control active games including auto-draw functionality
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header';
import { AdminNav } from '../../components/admin/AdminNav';
import { AdminGameControls } from '../../components/admin/AdminGameControls';
import { socket, onReconnect } from '../../lib/socket';
import { useAuth } from '../../contexts/AuthContext';
import type { Room } from '@bingo/shared-types';
import { GameEvent } from '@bingo/shared-types';
import {
  Loader2,
  ArrowLeft,
  Users,
  Target,
  DollarSign,
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export function AdminGameControlPage() {
  const { sessionId, roomId } = useParams<{ sessionId: string; roomId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Fetch initial room data
  useEffect(() => {
    if (!roomId || !session) return;

    const fetchRoomData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${backendUrl}/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch room data');
        }

        const data = await response.json();
        setRoom(data.data);
      } catch (err) {
        console.error('Error fetching room:', err);
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomData();
  }, [roomId, session, backendUrl]);

  // Listen for real-time room updates
  useEffect(() => {
    if (!roomId) return;

    const handleRoomUpdated = (updatedRoom: Room) => {
      if (updatedRoom.id === roomId) {
        setRoom(updatedRoom);
      }
    };

    const handleBallCalled = ({ ball }: { ball: number }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentBall: ball,
          drawnBalls: [...(prev.drawnBalls || []), ball],
        };
      });
    };

    const handleGameStarted = (updatedRoom: Room) => {
      if (updatedRoom.id === roomId) {
        setRoom(updatedRoom);
      }
    };

    const handleGamePaused = () => {
      setRoom((prev) => (prev ? { ...prev, status: 'paused' } : prev));
    };

    const handleGameEnded = () => {
      setRoom((prev) => (prev ? { ...prev, status: 'ended' } : prev));
    };

    // Socket connection
    if (!socket.connected) {
      socket.connect();
    }

    // Join room for real-time updates
    socket.emit('join_admin_room', { roomId });

    socket.on(GameEvent.ROOM_UPDATED, handleRoomUpdated);
    socket.on(GameEvent.BALL_CALLED, handleBallCalled);
    socket.on(GameEvent.GAME_STARTED, handleGameStarted);
    socket.on(GameEvent.GAME_PAUSED, handleGamePaused);
    socket.on(GameEvent.GAME_ENDED, handleGameEnded);

    return () => {
      socket.emit('leave_admin_room', { roomId });
      socket.off(GameEvent.ROOM_UPDATED, handleRoomUpdated);
      socket.off(GameEvent.BALL_CALLED, handleBallCalled);
      socket.off(GameEvent.GAME_STARTED, handleGameStarted);
      socket.off(GameEvent.GAME_PAUSED, handleGamePaused);
      socket.off(GameEvent.GAME_ENDED, handleGameEnded);
    };
  }, [roomId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
            <Clock className="w-4 h-4 mr-1" />
            Esperando
          </span>
        );
      case 'playing':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
            <Play className="w-4 h-4 mr-1" />
            En Juego
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200">
            <Pause className="w-4 h-4 mr-1" />
            Pausado
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200">
            <CheckCircle className="w-4 h-4 mr-1" />
            Finalizado
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-gray-700 dark:text-gray-300">Cargando sala...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
              Error al cargar la sala
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Sala no encontrada'}</p>
            <button
              onClick={() => navigate(sessionId ? `/admin/sessions/${sessionId}/rooms` : '/admin/sessions')}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Salas de Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(sessionId ? `/admin/sessions/${sessionId}/rooms` : '/admin/sessions')}
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver a Salas de Sesión
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Control de Sala
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">ID: {room.id.slice(0, 8)}...</p>
            </div>
            {getStatusBadge(room.status)}
          </div>
        </div>

        {/* Room Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Conectados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {room.players?.length || 0} / {room.maxPlayers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Patrón</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {room.pattern}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Premio</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${room.prizeAmount || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <div className="flex items-center">
              <Play className="w-8 h-8 text-orange-600 dark:text-orange-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bolas Sacadas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {room.drawnBalls?.length || 0} / 75
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Ball Display */}
        {room.currentBall && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 mb-6 text-center">
            <p className="text-white text-sm uppercase tracking-wide mb-2">Última Bola</p>
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-xl">
              <span className="text-5xl font-bold text-gray-900">{room.currentBall}</span>
            </div>
          </div>
        )}

        {/* Auto-Draw Controls */}
        {room.status === 'playing' && (
          <div className="mb-6">
            <AdminGameControls roomId={room.id} gameStatus={room.status} />
          </div>
        )}

        {/* Drawn Balls History */}
        {room.drawnBalls && room.drawnBalls.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Historial de Bolas ({room.drawnBalls.length})
            </h3>
            <div className="grid grid-cols-10 gap-2">
              {room.drawnBalls.map((ball, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white font-semibold"
                >
                  {ball}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
