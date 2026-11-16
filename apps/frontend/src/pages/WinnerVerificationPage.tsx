/**
 * Winner Verification Page
 * Admin page for managing bingo winner claims
 */

import { useEffect, useState } from 'react';
import { useWinnerVerification } from '../hooks/useWinnerVerification';
import { WinnerCard } from '../components/admin/WinnerCard';
import { CardVerificationModal } from '../components/admin/CardVerificationModal';
import { getSocket } from '../lib/socket';

interface WinnerClaimEvent {
  claimId: string;
  playerId: string;
  playerNickname?: string;
  roomId: string;
  sessionId: string;
  cardId: string;
  claimedAt: Date;
}

export function WinnerVerificationPage() {
  const {
    pendingClaims,
    winnersHistory,
    loading,
    error,
    verifyClaim,
    fetchClaimDetails,
    fetchPendingClaims,
    fetchWinnersHistory,
  } = useWinnerVerification();

  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fetch initial data on mount
  useEffect(() => {
    fetchPendingClaims();
    fetchWinnersHistory();
  }, [fetchPendingClaims, fetchWinnersHistory]);

  // Socket.IO listener for real-time claim updates
  useEffect(() => {
    const socket = getSocket();

    const handleNewClaim = (data: WinnerClaimEvent) => {
      fetchPendingClaims(); // Refresh pending claims
      showToast('success', `Nueva reclamación de ${data.playerNickname || 'jugador'}`);
    };

    socket.on('winner:claim', handleNewClaim);

    return () => {
      socket.off('winner:claim', handleNewClaim);
    };
  }, [fetchPendingClaims]);

  // Toast notification handler
  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handle claim verification
  const handleVerifyConfirm = async (approved: boolean, reason?: string) => {
    if (!selectedClaimId) return;

    try {
      await verifyClaim(selectedClaimId, approved, reason);
      showToast(
        'success',
        approved ? 'Reclamación aprobada exitosamente' : 'Reclamación rechazada exitosamente'
      );
      setSelectedClaimId(null);
      // Refresh both lists
      await Promise.all([fetchPendingClaims(), fetchWinnersHistory()]);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Error al verificar reclamación');
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-200 rounded-lg h-48"></div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Verificación de Ganadores
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gestiona y verifica las reclamaciones de bingo de los jugadores
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchPendingClaims}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Actualizar reclamaciones pendientes"
              >
                <svg
                  className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Error Message */}
        {error && (
          <div
            className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 transition-colors"
            role="alert"
            aria-live="polite"
          >
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mr-3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Claims Section */}
        <section className="mb-12" aria-labelledby="pending-claims-heading">
          <div className="flex items-center justify-between mb-6">
            <h2
              id="pending-claims-heading"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              Reclamaciones Pendientes
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 transition-colors">
              {pendingClaims.length} {pendingClaims.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          {loading && pendingClaims.length === 0 ? (
            <LoadingSkeleton />
          ) : pendingClaims.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingClaims.map((claim) => (
                <WinnerCard
                  key={claim.id}
                  claim={claim}
                  onVerify={() => setSelectedClaimId(claim.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center transition-colors">
              <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay reclamaciones pendientes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Todas las reclamaciones han sido verificadas o no hay nuevas reclamaciones.
              </p>
            </div>
          )}
        </section>

        {/* Winners History Section */}
        <section aria-labelledby="winners-history-heading">
          <div className="flex items-center justify-between mb-6">
            <h2
              id="winners-history-heading"
              className="text-2xl font-bold text-gray-900 dark:text-white"
            >
              Historial de Ganadores
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 transition-colors">
              {winnersHistory.length} {winnersHistory.length === 1 ? 'ganador' : 'ganadores'}
            </span>
          </div>

          {loading && winnersHistory.length === 0 ? (
            <LoadingSkeleton />
          ) : winnersHistory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {winnersHistory.map((winner) => (
                <WinnerCard
                  key={winner.id}
                  claim={winner}
                  onVerify={() => setSelectedClaimId(winner.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center transition-colors">
              <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay historial de ganadores
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Los ganadores verificados aparecerán aquí una vez que se procesen las reclamaciones.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Verification Modal */}
      {selectedClaimId && (
        <CardVerificationModal
          claimId={selectedClaimId}
          onConfirm={handleVerifyConfirm}
          onCancel={() => setSelectedClaimId(null)}
          fetchClaimDetails={fetchClaimDetails}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up"
          role="alert"
          aria-live="polite"
        >
          <div
            className={`rounded-lg shadow-lg p-4 transition-colors ${
              toastMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
            }`}
          >
            <div className="flex items-start">
              {toastMessage.type === 'success' ? (
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    toastMessage.type === 'success'
                      ? 'text-green-800 dark:text-green-400'
                      : 'text-red-800 dark:text-red-400'
                  }`}
                >
                  {toastMessage.message}
                </p>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className={`ml-3 flex-shrink-0 transition-colors ${
                  toastMessage.type === 'success'
                    ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                    : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300'
                }`}
                aria-label="Cerrar notificación"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
