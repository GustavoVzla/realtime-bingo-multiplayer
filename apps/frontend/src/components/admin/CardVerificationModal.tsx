/**
 * Card Verification Modal
 * Full-screen modal for admin to verify bingo claims
 */

import { useEffect, useState } from 'react';
import type { ClaimDetails, BingoPattern } from '@bingo/shared-types';
import { BingoCard } from '../BingoCard';

interface CardVerificationModalProps {
  claimId: string;
  onConfirm: (approved: boolean, reason?: string) => Promise<void>;
  onCancel: () => void;
  fetchClaimDetails: (claimId: string) => Promise<ClaimDetails | null>;
}

export function CardVerificationModal({
  claimId,
  onConfirm,
  onCancel,
  fetchClaimDetails,
}: CardVerificationModalProps) {
  const [claimDetails, setClaimDetails] = useState<ClaimDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadClaimDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await fetchClaimDetails(claimId);
        if (details) {
          setClaimDetails(details);
        } else {
          setError('No se pudieron cargar los detalles de la reclamación');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadClaimDetails();
  }, [claimId, fetchClaimDetails]);

  const handleConfirm = async (approved: boolean) => {
    if (!approved && !adminNotes.trim()) {
      setError('Debe proporcionar una razón para rechazar la reclamación');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(approved, adminNotes.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar');
    } finally {
      setSubmitting(false);
    }
  };

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

  const getPatternName = (pattern: BingoPattern): string => {
    const patterns: Record<BingoPattern, string> = {
      horizontal: 'Línea Horizontal',
      vertical: 'Línea Vertical',
      diagonal: 'Diagonal',
      L: 'Forma de L',
      M: 'Forma de M',
      O: 'Forma de O',
      X: 'Forma de X',
      four_corners: 'Cuatro Esquinas',
      full_card: 'Cartón Lleno',
    };
    return patterns[pattern] || pattern;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
          <h2 id="modal-title" className="text-2xl font-bold text-white">
            Verificación de Bingo
          </h2>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded"
            aria-label="Cerrar modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando detalles...</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {claimDetails && !loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Claim Information */}
              <div className="space-y-6">
                {/* Player Info */}
                <section className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Información del Jugador
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Nickname:</dt>
                      <dd className="text-sm text-gray-900 font-semibold">
                        {claimDetails.playerNickname}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Player ID:</dt>
                      <dd className="text-sm text-gray-900 font-mono">
                        {claimDetails.playerId.slice(0, 12)}...
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Reclamado:</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(claimDetails.claimedAt)}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Game Info */}
                <section className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Información del Juego
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Patrón:</dt>
                      <dd className="text-sm text-gray-900 font-semibold">
                        {getPatternName(claimDetails.pattern)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Sala:</dt>
                      <dd className="text-sm text-gray-900 font-mono">{claimDetails.roomId}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-gray-600">Sesión:</dt>
                      <dd className="text-sm text-gray-900 font-mono">
                        {claimDetails.sessionId.slice(0, 12)}...
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Drawn Balls */}
                <section className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Bolas Cantadas ({claimDetails.drawnBalls.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                    {claimDetails.drawnBalls.map((ball, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 text-white font-bold rounded-full text-sm"
                      >
                        {ball}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Auto-Verification Result */}
                <section
                  className={`rounded-lg p-5 ${
                    claimDetails.autoVerification.isValid
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-4">
                    <span
                      className={
                        claimDetails.autoVerification.isValid ? 'text-green-900' : 'text-red-900'
                      }
                    >
                      Verificación Automática
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      {claimDetails.autoVerification.isValid ? (
                        <svg
                          className="w-6 h-6 text-green-600 mr-2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6 text-red-600 mr-2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      )}
                      <span
                        className={`font-semibold ${
                          claimDetails.autoVerification.isValid ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {claimDetails.autoVerification.isValid
                          ? 'Patrón Válido'
                          : 'Patrón Inválido'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Celdas Coincidentes: {claimDetails.autoVerification.matchedCells.length}
                      </p>
                      {claimDetails.autoVerification.missingCells.length > 0 && (
                        <p className="text-sm font-medium text-gray-700">
                          Celdas Faltantes: {claimDetails.autoVerification.missingCells.length}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Admin Notes */}
                <section className="bg-gray-50 rounded-lg p-5">
                  <label
                    htmlFor="admin-notes"
                    className="block text-lg font-semibold text-gray-900 mb-3"
                  >
                    Notas del Administrador
                  </label>
                  <textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Agregar notas o razón de rechazo..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    aria-describedby={
                      !claimDetails.autoVerification.isValid ? 'rejection-hint' : undefined
                    }
                  />
                  {!claimDetails.autoVerification.isValid && (
                    <p id="rejection-hint" className="mt-2 text-sm text-red-600">
                      * Se requiere una razón para rechazar la reclamación
                    </p>
                  )}
                </section>
              </div>

              {/* Right Column - Bingo Card Visualization */}
              <div className="space-y-6">
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                    Tarjeta de Bingo
                  </h3>
                  <div className="flex justify-center">
                    <BingoCard
                      card={claimDetails.card}
                      drawnBalls={claimDetails.drawnBalls}
                      canMark={false}
                    />
                  </div>
                </section>

                {/* Pattern Visualization Hint */}
                <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    Patrón Requerido: {getPatternName(claimDetails.pattern)}
                  </h4>
                  <p className="text-sm text-blue-800">
                    Verifique que las celdas marcadas en verde coincidan con el patrón requerido
                    para esta sesión de bingo.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        {claimDetails && !loading && (
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={submitting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Rechazando...' : 'Rechazar'}
            </button>
            <button
              onClick={() => handleConfirm(true)}
              disabled={submitting}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Aprobando...' : 'Aprobar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
