/**
 * Session Card Component
 * Displays session information in a card format
 */

import { SessionListItem, SessionStatus, BingoPattern } from '@bingo/shared-types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface SessionCardProps {
  session: SessionListItem;
  onEdit: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onClick: (sessionId: string) => void;
}

const statusConfig = {
  [SessionStatus.SCHEDULED]: {
    label: 'Programada',
    color: 'bg-blue-100 text-blue-800',
    icon: '📅',
  },
  [SessionStatus.ACTIVE]: {
    label: 'Activa',
    color: 'bg-green-100 text-green-800',
    icon: '🎮',
  },
  [SessionStatus.COMPLETED]: {
    label: 'Completada',
    color: 'bg-gray-100 text-gray-800',
    icon: '✓',
  },
  [SessionStatus.CANCELLED]: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: '✕',
  },
};

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

export function SessionCard({
  session,
  onEdit,
  onDelete,
  onClick,
}: SessionCardProps) {
  const navigate = useNavigate();

  const statusInfo = statusConfig[session.status];
  const dateTime = new Date(session.date_time);
  const formattedDate = format(dateTime, "d 'de' MMMM, yyyy", { locale: es });
  const formattedTime = format(dateTime, 'HH:mm', { locale: es });

  // Get timezone abbreviation for clarity
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneShort = dateTime.toLocaleTimeString('es', {
    timeZoneName: 'short',
    timeZone
  }).split(' ').pop(); // Gets "CET", "VET", etc.

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick(session.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(session.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(session.id);
  };

  const handleViewRooms = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/admin/sessions/${session.id}/rooms`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-2xl">{statusInfo.icon}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {/* Rooms Count Badge */}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              🏠 {session.rooms_count} {session.rooms_count === 1 ? 'Sala' : 'Salas'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{formattedDate}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formattedTime} <span className="text-xs text-gray-500 dark:text-gray-500">({timeZoneShort})</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Editar sesión"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Eliminar sesión"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Session Details */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Precio por cartón</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {session.card_price != null ? `$${session.card_price.toFixed(2)}` : 'Variable'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Patrón</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {patternLabels[session.winning_pattern]}
          </p>
        </div>
        {session.prize_amount != null && (
          <div className="col-span-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Premio</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-500">
              ${session.prize_amount.toFixed(2)}
            </p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {session.sold_cards}/{session.total_cards}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Cartones</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {session.player_count}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Participantes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              ${session.total_revenue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Ingresos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
              {session.pending_payments}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Pendientes</p>
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {session.pending_payments > 0 && (
        <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-2 transition-colors">
          <svg
            className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="text-sm text-orange-800 dark:text-orange-400">
            {session.pending_payments}{' '}
            {session.pending_payments === 1 ? 'pago pendiente' : 'pagos pendientes'} de aprobación
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end gap-3">
        {/* View Rooms Button - Always visible */}
        <button
          onClick={handleViewRooms}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
            />
          </svg>
          Ver Salas
        </button>
      </div>
    </div>
  );
}
