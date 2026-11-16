/**
 * Error Modal Component
 * Displays error message when payment submission fails
 */

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  onRetry?: () => void;
}

export function ErrorModal({ isOpen, onClose, errorMessage, onRetry }: ErrorModalProps) {
  if (!isOpen) return null;

  const handleRetry = () => {
    onClose();
    onRetry?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="error-modal-title"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
        {/* Error Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 id="error-modal-title" className="text-2xl font-bold text-center text-gray-900 mb-2">
          Error al Enviar Pago
        </h2>

        {/* Error Message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>

        {/* Help Text */}
        <p className="text-center text-gray-600 text-sm mb-6">
          Por favor, verifica los datos ingresados e intenta nuevamente. Si el problema persiste,
          contacta al soporte.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          {onRetry && (
            <button
              onClick={handleRetry}
              className="flex-1 px-4 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              Reintentar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
