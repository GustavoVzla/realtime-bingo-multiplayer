/**
 * Payment Page
 * Allows players to submit payment for selected bingo cards
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { PurchaseSummaryCard } from '../components/payments/PurchaseSummaryCard';
import { PaymentFormContainer } from '../components/payments/PaymentFormContainer';
import { SuccessModal } from '../components/payments/modals/SuccessModal';
import { ErrorModal } from '../components/payments/modals/ErrorModal';
import type { Tables } from '@bingo/shared-types';

type BingoSession = Tables<'bingo_sessions'>;

interface PaymentPageLocationState {
  sessionId: string;
  selectedCards: string[];
  totalAmount: number;
  session?: BingoSession;
}

export function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Location state validation
  const state = location.state as PaymentPageLocationState | null;

  // Local state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | undefined>();

  // Validate location state on mount
  useEffect(() => {
    if (!state?.sessionId || !state?.selectedCards || !state?.totalAmount) {
      console.error('Invalid payment page state:', state);
      navigate('/', {
        replace: true,
      });
    }
  }, [state, navigate]);

  // Early return if no state (will redirect via useEffect)
  if (!state?.sessionId || !state?.selectedCards || !state?.totalAmount) {
    return null;
  }

  const { sessionId, selectedCards, totalAmount, session } = state;
  const pricePerCard = session?.card_price || totalAmount / selectedCards.length;

  // Format session date if available
  const sessionInfo = session
    ? {
        date: new Date(session.date_time).toLocaleDateString('es', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        pattern: session.winning_pattern,
      }
    : undefined;

  // Handlers
  const handleSuccess = (newPaymentId?: string) => {
    setPaymentId(newPaymentId);
    setShowSuccessModal(true);
  };

  const handleError = (error: Error) => {
    setErrorMessage(error.message || 'Ocurrió un error al procesar tu pago');
    setShowErrorModal(true);
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const handleRetry = () => {
    // Form will retain data, just close modal
    setShowErrorModal(false);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link to="/" className="hover:text-purple-600 transition-colors">
                Inicio
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </li>
            <li>
              <Link
                to={`/session/${sessionId}`}
                className="hover:text-purple-600 transition-colors"
              >
                Selección de Cartones
              </Link>
            </li>
            <li>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </li>
            <li className="font-medium text-gray-900 dark:text-white">Pago</li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Procesar Pago</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Completa el pago para reservar tus cartones de bingo
          </p>
        </div>

        {/* Purchase Summary */}
        <PurchaseSummaryCard
          selectedCardsCount={selectedCards.length}
          pricePerCard={pricePerCard}
          totalAmount={totalAmount}
          sessionInfo={sessionInfo}
        />

        {/* Payment Form Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Información de Pago
          </h2>

          <PaymentFormContainer
            sessionId={sessionId}
            cardIds={selectedCards}
            pricePerCard={pricePerCard}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>

        {/* Back Button */}
        <div className="flex justify-start">
          <Link
            to={`/session/${sessionId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver a Selección de Cartones
          </Link>
        </div>
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        paymentId={paymentId}
        estimatedApprovalTime="24 horas"
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={handleCloseErrorModal}
        errorMessage={errorMessage}
        onRetry={handleRetry}
      />
    </div>
  );
}
