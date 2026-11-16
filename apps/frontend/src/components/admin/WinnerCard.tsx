/**
 * Winner Card Component
 * Displays a pending claim card for admin verification
 */

import type { PendingClaim } from '@bingo/shared-types';

interface WinnerCardProps {
  claim: PendingClaim;
  onVerify: () => void;
}

export function WinnerCard({ claim, onVerify }: WinnerCardProps) {
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStatusBadge = () => {
    switch (claim.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pendiente
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Verificado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <article
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 border-yellow-400 overflow-hidden"
      aria-label={`Reclamación de bingo de ${claim.playerNickname}`}
    >
      <div className="p-6">
        {/* Header with status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{claim.playerNickname}</h3>
            <p className="text-sm text-gray-500">ID: {claim.playerId.slice(0, 8)}...</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Claim details */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Sala:</span>
            <span className="text-sm text-gray-900 font-mono">{claim.roomId}</span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Sesión:</span>
            <span className="text-sm text-gray-900 font-mono truncate max-w-[160px]">
              {claim.sessionId.slice(0, 12)}...
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Tarjeta:</span>
            <span className="text-sm text-gray-900 font-mono truncate max-w-[160px]">
              {claim.cardId.slice(0, 12)}...
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-600">Reclamado:</span>
            <span className="text-sm text-gray-900">{formatDate(claim.claimedAt)}</span>
          </div>
        </div>

        {/* Action button */}
        {claim.status === 'pending' && (
          <button
            onClick={onVerify}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Verificar reclamación de ${claim.playerNickname}`}
          >
            Verificar Ahora
          </button>
        )}

        {claim.status !== 'pending' && (
          <button
            onClick={onVerify}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label={`Ver detalles de reclamación de ${claim.playerNickname}`}
          >
            Ver Detalles
          </button>
        )}
      </div>
    </article>
  );
}
