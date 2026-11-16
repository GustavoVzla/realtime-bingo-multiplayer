/**
 * RoomsList Component
 * Display list of game rooms for a specific session
 */

import { GameRoom } from '@bingo/shared-types';
import { useState } from 'react';
import { Edit2 } from 'lucide-react';

interface PlayerDetail {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  cards_count: number;
  is_ready: boolean;
}

interface RoomsListProps {
  rooms: (GameRoom & {
    current_players?: number;
    in_memory?: boolean;
    players?: PlayerDetail[];
    cards_sold?: number;
    revenue?: number;
  })[];
  sessionId: string;
  loading?: boolean;
  onCreateRoom?: () => void;
  onEditRoom?: (room: GameRoom) => void;
}

export function RoomsList({ rooms, loading, onCreateRoom, onEditRoom }: RoomsListProps) {
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const toggleRoom = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
        <div className="text-4xl mb-4">🚪</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No hay salas para esta sesión
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Aún no se han creado salas de juego para esta sesión
        </p>
        {onCreateRoom && (
          <button
            onClick={onCreateRoom}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            + Crear Primera Sala
          </button>
        )}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: {
        text: 'Esperando',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      },
      active: {
        text: 'En Juego',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      },
      paused: {
        text: 'Pausado',
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
      },
      finished: {
        text: 'Finalizado',
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getRoomTypeBadge = (roomType: string) => {
    const typeConfig = {
      general: {
        text: 'GENERAL',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      },
      vip: {
        text: 'VIP',
        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      },
      premium: {
        text: 'PREMIUM',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      },
    };

    const config = typeConfig[roomType as keyof typeof typeConfig] || typeConfig.general;

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Salas de Juego</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {rooms.length} sala{rooms.length !== 1 ? 's' : ''} configurada
            {rooms.length !== 1 ? 's' : ''}
          </p>
        </div>
        {onCreateRoom && (
          <button
            onClick={onCreateRoom}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            + Crear Sala
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {rooms.map((room) => {
          const isExpanded = expandedRooms.has(room.id);
          const hasPlayers = room.players && room.players.length > 0;

          return (
            <div
              key={room.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {room.name}
                    </h4>
                    {room.room_type && getRoomTypeBadge(room.room_type)}
                    {getStatusBadge(room.status)}
                    {room.is_active !== undefined && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          room.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}
                      >
                        {room.is_active ? '● Activa' : '● Inactiva'}
                      </span>
                    )}
                    {room.in_memory && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        ✓ En Memoria
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4 mt-3">
                    {/* Jugadores Conectados */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Conectados
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {room.current_players ?? 0} / {room.max_players}
                      </p>
                      {room.min_players !== undefined && room.min_players > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Mín: {room.min_players}
                        </p>
                      )}
                    </div>

                    {/* Precio */}
                    {room.price_per_card !== undefined && room.price_per_card !== null && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Precio/Cartón
                        </p>
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          ${room.price_per_card.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Cartones Vendidos */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Cartones Vendidos
                      </p>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {room.cards_sold ?? 0}
                      </p>
                    </div>

                    {/* Ingresos */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Ingresos
                      </p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        ${(room.revenue ?? 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Premio */}
                    {room.prize_amount !== null && room.prize_amount !== undefined && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                          Premio
                        </p>
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          ${room.prize_amount.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {/* Creada */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        Creada
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(room.created_at).toLocaleDateString('es-VE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* ID Sala */}
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                        ID Sala
                      </p>
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                        {room.id}
                      </p>
                    </div>
                  </div>

                  {/* Show/Hide Players Button */}
                  {hasPlayers && (
                    <button
                      onClick={() => toggleRoom(room.id)}
                      className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                      {isExpanded ? 'Ocultar' : 'Ver'} Detalles de Jugadores ({room.current_players})
                    </button>
                  )}

                  {/* Players List */}
                  {isExpanded && hasPlayers && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Jugadores en la Sala
                      </h5>
                      <div className="space-y-2">
                        {room.players!.map((player, idx) => (
                          <div
                            key={`${player.id}-${idx}`}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {player.nickname}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {player.email}
                                </p>
                                {player.phone && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    📱 {player.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Cartones</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {player.cards_count}
                                </p>
                              </div>
                              {player.is_ready && (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                  ✓ Listo
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {onEditRoom && (
                  <button
                    onClick={() => onEditRoom(room as GameRoom)}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors flex-shrink-0"
                    title="Editar sala"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
