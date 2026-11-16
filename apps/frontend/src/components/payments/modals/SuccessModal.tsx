/**
 * Success Modal Component
 * Displays success message after payment submission
 */

import { useNavigate } from 'react-router-dom';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  estimatedApprovalTime?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  paymentId,
  estimatedApprovalTime = '24 horas',
}: SuccessModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoHome = () => {
    onClose();
    navigate('/');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="success-modal-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 id="success-modal-title" className="text-2xl font-bold text-center text-gray-900 mb-2">
          Pago Enviado Exitosamente
        </h2>

        {/* Message */}
        <p className="text-center text-gray-600 mb-4">
          Tu solicitud de pago ha sido recibida y está pendiente de aprobación por un administrador.
        </p>

        {/* Payment ID */}
        {paymentId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600 mb-1">ID de Transacción:</p>
            <p className="text-xs font-mono text-gray-800 break-all">{paymentId}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">¿Qué sigue?</p>
              <p className="text-sm text-blue-800">
                Un administrador revisará tu pago en las próximas{' '}
                <span className="font-semibold">{estimatedApprovalTime}</span>. Te notificaremos
                cuando sea aprobado y tus cartones serán asignados automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleGoHome}
            className="flex-1 px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
