/**
 * Room Form Modal Component
 * Modal for creating and editing game rooms
 */

import { useState, useEffect } from 'react';
import { X, AlertCircle, DollarSign, Users, Award, Home } from 'lucide-react';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roomData: RoomFormData) => Promise<void>;
  initialData?: RoomFormData;
  mode: 'create' | 'edit';
  sessionId: string;
}

export interface RoomFormData {
  name: string;
  room_type: 'general' | 'vip' | 'premium';
  max_players: number;
  min_players: number;
  price_per_card: number;
  prize_amount: number;
  cards_per_room: number;
}

const ROOM_TYPE_CONFIG = {
  general: {
    label: 'General',
    icon: '🏠',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    defaultMaxPlayers: 50,
    defaultMinPlayers: 10,
    defaultPrice: 1,
    defaultPrize: 10,
    defaultCardsPerRoom: 100,
  },
  vip: {
    label: 'VIP',
    icon: '👑',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
    defaultMaxPlayers: 30,
    defaultMinPlayers: 10,
    defaultPrice: 5,
    defaultPrize: 50,
    defaultCardsPerRoom: 100,
  },
  premium: {
    label: 'Premium',
    icon: '⭐',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    defaultMaxPlayers: 40,
    defaultMinPlayers: 10,
    defaultPrice: 10,
    defaultPrize: 100,
    defaultCardsPerRoom: 100,
  },
};

export function RoomFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: RoomFormModalProps) {
  const [formData, setFormData] = useState<RoomFormData>({
    name: '',
    room_type: 'general',
    max_players: 50,
    min_players: 10,
    price_per_card: 1,
    prize_amount: 10,
    cards_per_room: 100,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RoomFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        // Reset to defaults for create mode
        setFormData({
          name: '',
          room_type: 'general',
          max_players: 50,
          min_players: 10,
          price_per_card: 1,
          prize_amount: 10,
          cards_per_room: 100,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialData]);

  const handleRoomTypeChange = (roomType: 'general' | 'vip' | 'premium') => {
    const config = ROOM_TYPE_CONFIG[roomType];
    setFormData({
      ...formData,
      room_type: roomType,
      max_players: config.defaultMaxPlayers,
      min_players: config.defaultMinPlayers,
      price_per_card: config.defaultPrice,
      prize_amount: config.defaultPrize,
      cards_per_room: config.defaultCardsPerRoom,
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RoomFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (formData.max_players <= 0) {
      newErrors.max_players = 'La capacidad máxima debe ser mayor a 0';
    }

    if (formData.min_players < 0) {
      newErrors.min_players = 'El mínimo de jugadores no puede ser negativo';
    }

    if (formData.min_players > formData.max_players) {
      newErrors.min_players = 'El mínimo no puede ser mayor que la capacidad máxima';
    }

    if (formData.price_per_card <= 0) {
      newErrors.price_per_card = 'El precio debe ser mayor a 0';
    }

    if (formData.prize_amount <= 0) {
      newErrors.prize_amount = 'El premio debe ser mayor a 0';
    }

    if (formData.cards_per_room <= 0) {
      newErrors.cards_per_room = 'La cantidad de cartones debe ser mayor a 0';
    }

    if (formData.cards_per_room > 1000) {
      newErrors.cards_per_room = 'No se pueden generar más de 1000 cartones por sala';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting room form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar la sala');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? '➕ Crear Nueva Sala' : '✏️ Editar Sala'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Room Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Home className="w-4 h-4 inline mr-2" />
              Tipo de Sala
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(ROOM_TYPE_CONFIG) as Array<keyof typeof ROOM_TYPE_CONFIG>).map((type) => {
                const config = ROOM_TYPE_CONFIG[type];
                const isSelected = formData.room_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleRoomTypeChange(type)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-3xl mb-2">{config.icon}</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {config.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de la Sala
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.name
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              placeholder="Ej: Sala Premium 1"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Player Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-2" />
                Capacidad Máxima
              </label>
              <input
                type="number"
                min="1"
                value={formData.max_players}
                onChange={(e) =>
                  setFormData({ ...formData, max_players: parseInt(e.target.value) || 0 })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.max_players
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.max_players && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.max_players}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mínimo de Jugadores
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_players}
                onChange={(e) =>
                  setFormData({ ...formData, min_players: parseInt(e.target.value) || 0 })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.min_players
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.min_players && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.min_players}
                </p>
              )}
            </div>
          </div>

          {/* Pricing and Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-2" />
                Precio por Cartón ($)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.price_per_card}
                onChange={(e) =>
                  setFormData({ ...formData, price_per_card: parseFloat(e.target.value) || 0 })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.price_per_card
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.price_per_card && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.price_per_card}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Award className="w-4 h-4 inline mr-2" />
                Premio ($)
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={formData.prize_amount}
                onChange={(e) =>
                  setFormData({ ...formData, prize_amount: parseFloat(e.target.value) || 0 })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.prize_amount
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.prize_amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.prize_amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🎫 Cartones
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.cards_per_room}
                onChange={(e) =>
                  setFormData({ ...formData, cards_per_room: parseInt(e.target.value) || 0 })
                }
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.cards_per_room
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none`}
              />
              {errors.cards_per_room && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.cards_per_room}
                </p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">ℹ️</div>
              <div className="text-sm text-blue-900 dark:text-blue-300">
                <p className="font-semibold mb-1">Configuración de Sala:</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-400">
                  <li>• Puedes configurar el <strong>mínimo de jugadores</strong> manualmente para cada sala</li>
                  <li>• Las salas <strong>General</strong> están siempre activas automáticamente</li>
                  <li>• Todas las salas de una sesión comparten el mismo sorteo de bolas</li>
                  <li>• Cada sala tiene su propio <strong>precio, premio y capacidad</strong> independientes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  {mode === 'create' ? '➕ Crear Sala' : '💾 Guardar Cambios'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
