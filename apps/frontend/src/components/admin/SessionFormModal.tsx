/**
 * Session Form Modal
 * Modal for creating and editing bingo sessions
 */

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import {
  CreateSessionRequest,
  UpdateSessionRequest,
  BingoPattern,
  SessionStatus,
} from '@bingo/shared-types';

interface SessionFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: UpdateSessionRequest & {
    id: string;
    rooms?: Array<{
      id: string;
      name: string;
      room_type: 'general' | 'vip' | 'premium';
      max_players: number;
      min_players: number;
      price_per_card: number;
      prize_amount: number;
      cards_per_room: number;
      status: string;
    }>;
  };
  onClose: () => void;
  onSubmit: (data: CreateSessionRequest | UpdateSessionRequest) => Promise<void>;
  loading?: boolean;
}

// Map enum VALUES to display labels
const patternLabels: Record<BingoPattern, string> = {
  [BingoPattern.HORIZONTAL]: 'Horizontal',
  [BingoPattern.VERTICAL]: 'Vertical',
  [BingoPattern.DIAGONAL]: 'Diagonal',
  [BingoPattern.L_SHAPE]: 'Forma L',
  [BingoPattern.M_SHAPE]: 'Forma M',
  [BingoPattern.O_SHAPE]: 'Forma O',
  [BingoPattern.X_SHAPE]: 'Forma X',
  [BingoPattern.FOUR_CORNERS]: '4 Esquinas',
  [BingoPattern.FULL_CARD]: 'Cartón Lleno',
};

// Map enum VALUES to display labels
const statusLabels: Record<SessionStatus, string> = {
  [SessionStatus.SCHEDULED]: 'Programada',
  [SessionStatus.ACTIVE]: 'Activa',
  [SessionStatus.COMPLETED]: 'Completada',
  [SessionStatus.CANCELLED]: 'Cancelada',
};

type RoomConfig = {
  name: string;
  room_type: 'general' | 'vip' | 'premium';
  max_players: number;
  min_players: number;
  price_per_card: number;
  prize_amount: number;
  cards_per_room: number;
};

type FormData = {
  date_time: string;
  max_cards_per_player: number;
  winning_pattern: BingoPattern;
  description?: string;
  status?: SessionStatus;
};

// Helper to convert ISO 8601 to datetime-local format (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (isoString: string | undefined): string => {
  if (!isoString) return '';
  // Remove timezone and seconds: 2025-12-20T19:00:00+00:00 → 2025-12-20T19:00
  return isoString.slice(0, 16);
};

export function SessionFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  loading = false,
}: SessionFormModalProps) {
  const defaultValues: Partial<FormData> = initialData
    ? {
        date_time: toDatetimeLocal(initialData.date_time),
        max_cards_per_player: initialData.max_cards_per_player || 1,
        winning_pattern: initialData.winning_pattern || BingoPattern.HORIZONTAL,
        description: initialData.description ?? '',
        status: initialData.status,
      }
    : {
        date_time: '',
        max_cards_per_player: 1,
        winning_pattern: BingoPattern.HORIZONTAL,
        description: '',
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<FormData>({
    defaultValues,
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Room configuration state - load from initialData if editing, otherwise default General room
  const [rooms, setRooms] = useState<RoomConfig[]>(
    initialData?.rooms && initialData.rooms.length > 0
      ? initialData.rooms.map((room) => ({
          name: room.name,
          room_type: room.room_type,
          max_players: room.max_players,
          min_players: room.min_players,
          price_per_card: room.price_per_card,
          prize_amount: room.prize_amount,
          cards_per_room: room.cards_per_room,
        }))
      : [
          {
            name: 'General',
            room_type: 'general',
            max_players: 50,
            min_players: 0,
            price_per_card: 0,
            prize_amount: 100,
            cards_per_room: 100,
          },
        ]
  );

  if (!isOpen) return null;

  // Helper functions for room management
  const addRoom = (type: 'vip' | 'premium') => {
    const newRoom: RoomConfig = {
      name: type === 'vip' ? 'VIP' : 'Premium',
      room_type: type,
      max_players: 30,
      min_players: 0,
      price_per_card: 0,
      prize_amount: 0,
      cards_per_room: 100,
    };
    setRooms([...rooms, newRoom]);
  };

  const removeRoom = (index: number) => {
    // Cannot remove if it's the only General room
    const room = rooms[index];
    if (room.room_type === 'general') {
      const generalRooms = rooms.filter((r) => r.room_type === 'general');
      if (generalRooms.length === 1) {
        setSubmitError('Debe existir al menos una sala General por sesión');
        return;
      }
    }
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof RoomConfig, value: any) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };
    setRooms(updatedRooms);
  };

  const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
    // Prevent double submission
    if (isSubmitting || loading) {
      console.warn('⚠️ Form already submitting, ignoring duplicate submit');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null); // Clear previous errors

      // Manual validation
      if (!data.date_time) {
        setError('date_time', { message: 'La fecha y hora son requeridas' });
        setIsSubmitting(false);
        return;
      }

      if (mode === 'create') {
        const sessionDate = new Date(data.date_time);
        if (sessionDate <= new Date()) {
          setError('date_time', { message: 'La sesión debe ser programada en el futuro' });
          setIsSubmitting(false);
          return;
        }
      }

      if (
        !data.max_cards_per_player ||
        data.max_cards_per_player <= 0 ||
        data.max_cards_per_player > 100
      ) {
        setError('max_cards_per_player', { message: 'Debe ser entre 1 y 100' });
        setIsSubmitting(false);
        return;
      }

      // Validate rooms
      if (rooms.length === 0) {
        setSubmitError('Debe configurar al menos una sala');
        setIsSubmitting(false);
        return;
      }

      // Ensure at least one General room
      const hasGeneralRoom = rooms.some((r) => r.room_type === 'general');
      if (!hasGeneralRoom) {
        setSubmitError('Debe existir al menos una sala General por sesión');
        setIsSubmitting(false);
        return;
      }

      // Validate room prices and prizes
      for (const room of rooms) {
        if (room.price_per_card <= 0) {
          setSubmitError(`La sala "${room.name}" debe tener un precio mayor a 0`);
          setIsSubmitting(false);
          return;
        }

        if (room.prize_amount <= 0) {
          setSubmitError(`La sala "${room.name}" debe tener un premio mayor a 0`);
          setIsSubmitting(false);
          return;
        }

        if (room.max_players <= 0) {
          setSubmitError(`La sala "${room.name}" debe tener capacidad mayor a 0`);
          setIsSubmitting(false);
          return;
        }

        if (room.cards_per_room <= 0) {
          setSubmitError(`La sala "${room.name}" debe tener al menos 1 cartón`);
          setIsSubmitting(false);
          return;
        }

        if (room.cards_per_room > 1000) {
          setSubmitError(`La sala "${room.name}" no puede tener más de 1000 cartones`);
          setIsSubmitting(false);
          return;
        }
      }

      // Convert datetime-local format to ISO 8601 with timezone
      const formattedData = {
        ...data,
        date_time: new Date(data.date_time).toISOString(),
        rooms: rooms, // Include room configuration
      };

      await onSubmit(formattedData as any);
      reset();
      setSubmitError(null);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      // Show error in the modal
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar la sesión';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!loading) {
      reset();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Crear Nueva Sesión' : 'Editar Sesión'}
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          {/* Error Alert */}
          {submitError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm mt-1">{submitError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Date and Time */}
            <div>
              <label htmlFor="date_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha y Hora <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="date_time"
                {...register('date_time', { required: 'Este campo es requerido' })}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.date_time ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.date_time && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date_time.message}</p>
              )}
            </div>

            {/* Max Cards Per Player */}
            <div>
              <label
                htmlFor="max_cards_per_player"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Máx. Cartones por Jugador <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="max_cards_per_player"
                min="1"
                max="100"
                {...register('max_cards_per_player', {
                  required: 'Este campo es requerido',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Mínimo 1' },
                  max: { value: 100, message: 'Máximo 100' },
                })}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.max_cards_per_player ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.max_cards_per_player && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.max_cards_per_player.message}</p>
              )}
            </div>

            {/* Winning Pattern */}
            <div>
              <label
                htmlFor="winning_pattern"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Patrón Ganador <span className="text-red-500">*</span>
              </label>
              <select
                id="winning_pattern"
                {...register('winning_pattern', { required: 'Este campo es requerido' })}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.winning_pattern ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {Object.entries(patternLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.winning_pattern && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.winning_pattern.message}</p>
              )}
            </div>

            {/* Status (Edit mode only) */}
            {mode === 'edit' && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descripción <span className="text-gray-500 dark:text-gray-400">(opcional)</span>
              </label>
              <textarea
                id="description"
                rows={3}
                maxLength={500}
                {...register('description')}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Notas adicionales sobre la sesión..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            {/* Room Configuration - Only show in CREATE mode */}
            {mode === 'create' && (
              <div className="col-span-2">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Configuración de Salas
                    </h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => addRoom('vip')}
                        className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        + Sala VIP
                      </button>
                      <button
                        type="button"
                        onClick={() => addRoom('premium')}
                        className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        + Sala Premium
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {rooms.map((room, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                room.room_type === 'general'
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : room.room_type === 'vip'
                                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              }`}
                            >
                              {room.room_type.toUpperCase()}
                            </span>
                            <input
                              type="text"
                              value={room.name}
                              onChange={(e) => updateRoom(index, 'name', e.target.value)}
                              placeholder="Nombre de la sala"
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          {!(room.room_type === 'general' && rooms.filter(r => r.room_type === 'general').length === 1) && (
                            <button
                              type="button"
                              onClick={() => removeRoom(index)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                          {/* Max Players */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Capacidad Máxima <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={room.max_players}
                              onChange={(e) => updateRoom(index, 'max_players', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Min Players */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Jugadores Mínimos <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={room.min_players}
                              onChange={(e) => updateRoom(index, 'min_players', parseInt(e.target.value) || 0)}
                              min="0"
                              disabled={room.room_type === 'general'}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800"
                            />
                          </div>

                          {/* Price Per Card */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Precio por Cartón ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={room.price_per_card}
                              onChange={(e) => updateRoom(index, 'price_per_card', parseFloat(e.target.value) || 0)}
                              min="0.01"
                              step="0.01"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Prize Amount */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Premio ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={room.prize_amount}
                              onChange={(e) => updateRoom(index, 'prize_amount', parseFloat(e.target.value) || 0)}
                              min="0.01"
                              step="0.01"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Cards Per Room */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Cartones <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={room.cards_per_room}
                              onChange={(e) => updateRoom(index, 'cards_per_room', parseInt(e.target.value) || 0)}
                              min="1"
                              max="1000"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="font-semibold mb-1">ℹ️ Información:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cada sesión debe tener al menos una sala <strong>General</strong></li>
                      <li>Todas las salas comparten el mismo sorteo (bolas sorteadas)</li>
                      <li>Cada sala puede tener precio de cartón y premio independiente</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Room Information - Only show in EDIT mode */}
            {mode === 'edit' && rooms.length > 0 && (
              <div className="col-span-2">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Salas de esta Sesión
                    </h3>
                    <a
                      href={`/admin/sessions/${initialData?.id}/rooms`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/admin/sessions/${initialData?.id}/rooms`;
                      }}
                    >
                      Gestionar Salas
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>

                  <div className="space-y-2">
                    {rooms.map((room, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              room.room_type === 'general'
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : room.room_type === 'vip'
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            }`}
                          >
                            {room.room_type.toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{room.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>👥 {room.max_players} jugadores</span>
                          <span>🎫 {room.cards_per_room} cartones</span>
                          <span>💵 ${room.price_per_card}/cartón</span>
                          <span>🏆 ${room.prize_amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="font-semibold mb-1">ℹ️ Información:</p>
                    <p>Para crear, editar o eliminar salas, usa el botón "Gestionar Salas" arriba.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-6 pt-6 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(loading || isSubmitting) && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              {loading || isSubmitting
                ? mode === 'create'
                  ? 'Creando...'
                  : 'Guardando...'
                : mode === 'create'
                  ? 'Crear Sesión'
                  : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
