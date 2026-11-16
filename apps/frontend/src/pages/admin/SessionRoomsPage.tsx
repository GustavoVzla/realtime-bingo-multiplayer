/**
 * Session Rooms Page
 * Admin page for viewing and managing game rooms for a specific session
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { AdminNav } from '../../components/admin/AdminNav';
import { RoomsList } from '../../components/admin/RoomsList';
import { AdminGameControls } from '../../components/admin/AdminGameControls';
import { RoomFormModal, RoomFormData } from '../../components/admin/RoomFormModal';
import { GameRoom, SessionListItem } from '@bingo/shared-types';
import { ArrowLeft, RefreshCw, Users, CreditCard, DollarSign, Clock, Play } from 'lucide-react';

export function SessionRoomsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [rooms, setRooms] = useState<
    (GameRoom & { current_players?: number; in_memory?: boolean })[]
  >([]);
  const [sessionData, setSessionData] = useState<SessionListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Room form modal states
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState<'create' | 'edit'>('create');
  const [selectedRoom, setSelectedRoom] = useState<GameRoom | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = session?.access_token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${backendUrl}/api/rooms/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar las salas');
      }

      const result = await response.json();
      setRooms(result.data || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las salas');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async () => {
    console.log('🔄 fetchSessionData called');
    try {
      const token = session?.access_token;
      if (!token || !sessionId) {
        console.log('❌ Early return: token or sessionId missing', { token: !!token, sessionId });
        return;
      }

      // First try to get from sessions list endpoint (has player_count)
      const listResponse = await fetch(`${backendUrl}/api/admin/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (listResponse.ok) {
        const listResult = await listResponse.json();
        console.log('📋 List API response:', listResult);
        if (listResult.success && listResult.data) {
          console.log('📋 Sessions count:', listResult.data.length);
          const foundSession = listResult.data.find((s: SessionListItem) => s.id === sessionId);
          console.log('🔍 Searching for session:', sessionId);
          console.log('🔍 Found session:', foundSession);
          if (foundSession) {
            console.log('📊 Session data from list endpoint:', foundSession);
            console.log('📅 original_date_time:', foundSession.original_date_time);
            setSessionData(foundSession);
            return;
          } else {
            console.log('⚠️ Session not found in list, trying individual endpoint');
          }
        }
      }

      // Fallback: get from individual session endpoint
      console.log('🔎 Fetching individual session:', sessionId);
      const response = await fetch(`${backendUrl}/api/admin/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('🔎 Individual endpoint response status:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('🔎 Individual endpoint result:', result);
        if (result.success && result.data) {
          console.log('🔎 Individual session data:', result.data);
          console.log('🔎 Individual original_date_time:', result.data.original_date_time);
          // Transform to SessionListItem format
          setSessionData({
            id: result.data.id,
            date_time: result.data.date_time,
            original_date_time: result.data.original_date_time || null, // ADDED: Original time before manual start
            card_price: result.data.card_price,
            winning_pattern: result.data.winning_pattern,
            prize_amount: result.data.prize_amount,
            status: result.data.status,
            room_id: result.data.room_id || null,
            sold_cards: result.data.stats?.sold_cards || 0,
            total_cards: result.data.stats?.total_cards || 0,
            player_count: result.data.stats?.unique_players || 0,
            total_revenue: result.data.stats?.total_revenue || 0,
            pending_payments: result.data.stats?.pending_payments || 0,
            rooms_count: 0, // Will be updated when rooms are fetched
          });
        }
      }
    } catch (err) {
      console.error('Error fetching session data:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchRooms();
      fetchSessionData();
    }
  }, [sessionId]);

  const handleRefresh = () => {
    fetchRooms();
    fetchSessionData(); // ADDED: Also refresh session data to get updated original_date_time
  };

  const handleStartGame = () => {
    setShowStartModal(true);
    setStartError(null);
  };

  const handleConfirmStart = async () => {
    try {
      setStarting(true);
      setStartError(null);

      const token = session?.access_token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Find the first active/waiting room to start (all rooms share the same game)
      const roomToStart = rooms.find((r) => r.status === 'waiting' || r.status === 'active');
      if (!roomToStart) {
        throw new Error('No se encontró una sala disponible para iniciar');
      }

      // Each room uses its own configured prize_amount
      const response = await fetch(`${backendUrl}/api/admin/rooms/${roomToStart.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prizeAmount: roomToStart.prize_amount }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al iniciar el juego');
      }

      // Refresh rooms and session data to get updated status and date_time
      await fetchRooms();
      await fetchSessionData();
      setShowStartModal(false);
    } catch (err) {
      console.error('Error starting game:', err);
      setStartError(err instanceof Error ? err.message : 'Error al iniciar el juego');
    } finally {
      setStarting(false);
    }
  };

  const handleCreateRoom = () => {
    setRoomModalMode('create');
    setSelectedRoom(null);
    setShowRoomModal(true);
  };

  const handleEditRoom = (room: GameRoom) => {
    setRoomModalMode('edit');
    setSelectedRoom(room);
    setShowRoomModal(true);
  };

  const handleSubmitRoom = async (roomData: RoomFormData) => {
    const token = session?.access_token;
    if (!token) {
      throw new Error('No authentication token available');
    }

    if (roomModalMode === 'create') {
      // Create new room
      const response = await fetch(`${backendUrl}/api/admin/rooms/sessions/${sessionId}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roomData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la sala');
      }

      // Refresh rooms
      await fetchRooms();
    } else {
      // Edit existing room
      if (!selectedRoom) {
        throw new Error('No room selected for editing');
      }

      const response = await fetch(`${backendUrl}/api/admin/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roomData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar la sala');
      }

      // Refresh rooms
      await fetchRooms();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <AdminNav />

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/admin/sessions')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver a Sesiones</span>
        </button>

        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {sessionData ? (
                <>
                  Sesión{' '}
                  {new Date(sessionData.date_time).toLocaleDateString('es-VE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </>
              ) : (
                'Salas de Juego'
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
              ID: {sessionId}
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Gestión de salas de juego
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Session Statistics */}
        {sessionData && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Participants */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Participantes
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {sessionData.player_count}
              </p>
            </div>

            {/* Cards */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cartones</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {sessionData.sold_cards}/{sessionData.total_cards}
              </p>
            </div>

            {/* Revenue */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Ingresos</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${sessionData.total_revenue.toFixed(2)}
              </p>
            </div>

            {/* Scheduled Time */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hora del Juego
                  {sessionData.original_date_time && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                      ✓ Actualizada
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {new Date(sessionData.date_time).toLocaleTimeString('es-VE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {new Date(sessionData.date_time).toLocaleDateString('es-VE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              {sessionData.original_date_time && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Hora programada original:
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    {new Date(sessionData.original_date_time).toLocaleTimeString('es-VE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    •{' '}
                    {new Date(sessionData.original_date_time).toLocaleDateString('es-VE', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <span className="text-xl">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Game Control Section */}
        {sessionData && rooms.length > 0 && (
          <div className="mb-8">
            {(() => {
              const activeRoom = rooms.find(
                (r) => r.status === 'active' || r.status === 'waiting'
              );
              const firstRoom = rooms[0];
              const controlRoom = activeRoom || firstRoom;

              if (!controlRoom) return null;

              const isPlaying = controlRoom.status === 'active';
              const isWaiting = controlRoom.status === 'waiting';

              return (
                <>
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Control de Juego</h2>
                        <p className="text-purple-100">
                          Controla el sorteo para todas las salas de esta sesión
                        </p>
                      </div>
                      {isWaiting && (
                        <button
                          onClick={handleStartGame}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
                        >
                          <Play className="w-5 h-5" />
                          Iniciar Juego
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Game Controls */}
                  <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-lg p-6">
                    {isPlaying ? (
                      <AdminGameControls
                        roomId={controlRoom.id}
                        gameStatus={controlRoom.status as 'waiting' | 'playing' | 'paused' | 'ended'}
                      />
                    ) : isWaiting ? (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🎮</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Sala en Espera
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          El juego está listo para comenzar. Presiona el botón para iniciar el sorteo.
                        </p>
                        <div className="inline-flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-sm text-blue-800 dark:text-blue-300">
                            Estado actual: <strong>Esperando jugadores</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">⏸️</div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Juego {controlRoom.status === 'paused' ? 'Pausado' : 'Finalizado'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          El juego ha sido {controlRoom.status === 'paused' ? 'pausado' : 'finalizado'}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Rooms List */}
        <RoomsList
          rooms={rooms}
          sessionId={sessionId!}
          loading={loading}
          onCreateRoom={handleCreateRoom}
          onEditRoom={handleEditRoom}
        />

        {/* Info Card */}
        {!loading && rooms.length > 0 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Acerca de las Salas Múltiples
                </h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-400">
                  <li>• Cada sesión puede tener múltiples salas: <strong>General</strong>, <strong>VIP</strong>, <strong>Premium</strong></li>
                  <li>• Si no especificas salas, se crea una sala "General" por defecto (50 jugadores)</li>
                  <li>• Todas las salas de una sesión comparten el <strong>mismo sorteo de bolas</strong></li>
                  <li>• Cada sala puede tener <strong>precio, premio y capacidad independientes</strong></li>
                  <li>• El estado "En Memoria" indica que la sala está cargada en el servidor</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Start Game Modal */}
        {showStartModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Iniciar Juego para Todas las Salas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Estás a punto de iniciar el juego para todas las salas de esta sesión. Una vez iniciado, <strong>el sorteo de bolas será compartido</strong> por todas las salas, pero <strong>cada sala tiene su propio premio independiente</strong>.
              </p>

              {/* Rooms Summary */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Salas activas en esta sesión:
                </h4>
                <div className="space-y-3">
                  {rooms.filter(room => room.is_active).map((room) => (
                    <div
                      key={room.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">
                              {room.name}
                            </h5>
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                              {room.room_type?.toUpperCase() || 'GENERAL'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Precio/Cartón:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                ${room.price_per_card?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Premio:</span>
                              <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                                ${room.prize_amount?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Capacidad:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {room.max_players} jugadores
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Conectados:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                {room.current_players || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Important Info */}
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl">ℹ️</div>
                  <div className="text-sm text-blue-900 dark:text-blue-300">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="space-y-1 text-blue-800 dark:text-blue-400">
                      <li>• El sorteo de bolas será <strong>compartido</strong> entre todas las salas</li>
                      <li>• Cada sala tiene su <strong>propio premio independiente</strong></li>
                      <li>• Los jugadores compiten solo dentro de su sala</li>
                      <li>• El juego inicia simultáneamente para todas las salas</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {startError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                  <span className="text-xl">⚠</span>
                  <span className="text-sm">{startError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStartModal(false);
                    setStartError(null);
                  }}
                  disabled={starting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmStart}
                  disabled={starting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {starting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Confirmar Inicio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Form Modal */}
        <RoomFormModal
          isOpen={showRoomModal}
          onClose={() => setShowRoomModal(false)}
          onSubmit={handleSubmitRoom}
          initialData={
            selectedRoom
              ? {
                  name: selectedRoom.name,
                  room_type: selectedRoom.room_type as 'general' | 'vip' | 'premium',
                  max_players: selectedRoom.max_players,
                  min_players: selectedRoom.min_players || 0,
                  price_per_card: selectedRoom.price_per_card || 0,
                  prize_amount: selectedRoom.prize_amount || 0,
                }
              : undefined
          }
          mode={roomModalMode}
          sessionId={sessionId!}
        />
      </div>
    </div>
  );
}
