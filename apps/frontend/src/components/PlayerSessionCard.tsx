import { format } from 'date-fns';
import { DollarSign, Users, Trophy, Grid3X3 } from 'lucide-react';
import type { Tables } from '@bingo/shared-types';

type BingoSession = Tables<'bingo_sessions'>;

interface SessionCardProps {
  session: BingoSession;
  onJoin?: (sessionId: string) => void;
  onJoinGame?: (sessionId: string) => void;
  isPast?: boolean; // Indicates if this is a past session
}

export function SessionCard({ session, onJoin, onJoinGame, isPast = false }: SessionCardProps) {
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const formatTime = (date: string | Date) => {
    return format(new Date(date), 'h:mm a');
  };

  const getPatternDisplay = (pattern: string) => {
    const patterns: Record<string, string> = {
      horizontal: 'Línea Horizontal',
      vertical: 'Línea Vertical',
      diagonal: 'Diagonal',
      L: 'Letra L',
      M: 'Letra M',
      O: 'Letra O',
      X: 'Letra X',
      four_corners: 'Cuatro Esquinas',
      full_card: 'Cartón Lleno',
    };
    return patterns[pattern] || pattern;
  };

  const getStatusBadge = (status: string | null) => {
    // Calculate effective status based on date
    const sessionDate = new Date(session.date_time);
    const now = new Date();
    const isExpired = sessionDate < now && status !== 'active' && status !== 'finished';

    const badges: Record<string, { bg: string; text: string; label: string }> = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Programado' },
      created: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Programado' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'En Vivo' },
      finished: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Finalizado' },
      expired: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Expirado' },
    };

    // If this is a past session, always show as 'Finalizado'
    if (isPast) {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges.finished.bg} ${badges.finished.text}`}
        >
          {badges.finished.label}
        </span>
      );
    }

    // Use 'expired' status if session date has passed
    const effectiveStatus = isExpired ? 'expired' : status || 'scheduled';
    const badge = badges[effectiveStatus] || badges.scheduled;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  // Check if session is expired
  const sessionDate = new Date(session.date_time);
  const now = new Date();
  const isExpired =
    sessionDate < now && session.status !== 'active' && session.status !== 'finished';

  const isJoinable =
    !isPast &&
    !isExpired &&
    (session.status === 'scheduled' || session.status === 'created' || session.status === 'active');
  const hasActiveRoom = !isPast && session.room_id !== null && session.status === 'active';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Header with Status */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Sesión de Bingo
            </h3>
            <div className="flex items-center gap-2">
              {getStatusBadge(session.status)}
              {hasActiveRoom && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                  🔴 EN VIVO
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(session.date_time)}
            </p>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {formatTime(session.date_time)}
            </p>
          </div>
        </div>

        {/* Session Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>Precio por cartón: </span>
            <span className="font-semibold text-gray-900 dark:text-white ml-1">
              ${session.card_price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Trophy className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>Premio: </span>
            <span className="font-semibold text-gray-900 dark:text-white ml-1">
              ${session.prize_amount ? session.prize_amount.toFixed(2) : '0.00'}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Grid3X3 className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>Patrón: </span>
            <span className="font-semibold text-gray-900 dark:text-white ml-1">
              {getPatternDisplay(session.winning_pattern)}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span>Máx. cartones por jugador: </span>
            <span className="font-semibold text-gray-900 dark:text-white ml-1">
              {session.max_cards_per_player}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {hasActiveRoom ? (
          <button
            onClick={() => onJoinGame?.(session.id)}
            className="w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            🎮 Unirse al Juego
          </button>
        ) : isJoinable ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onJoin?.(session.id)}
              className="py-2 px-4 rounded-md font-medium transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              💳 Comprar Cartones
            </button>
            <button
              onClick={() => onJoinGame?.(session.id)}
              className="py-2 px-4 rounded-md font-medium transition-colors duration-200 bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              🎯 Unirse a Sesión
            </button>
          </div>
        ) : (
          <button
            disabled
            className="w-full py-2 px-4 rounded-md font-medium transition-colors duration-200 bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            {isPast ? 'Sesión Finalizada' : isExpired ? 'Sesión Expirada' : 'No Disponible'}
          </button>
        )}
      </div>
    </div>
  );
}
