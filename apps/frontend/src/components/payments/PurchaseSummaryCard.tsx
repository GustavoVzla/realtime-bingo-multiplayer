/**
 * Purchase Summary Card Component
 * Displays a summary of selected cards and total amount
 */

interface PurchaseSummaryCardProps {
  selectedCardsCount: number;
  pricePerCard: number;
  totalAmount: number;
  sessionInfo?: {
    date: string;
    pattern: string;
  };
}

export function PurchaseSummaryCard({
  selectedCardsCount,
  pricePerCard,
  totalAmount,
  sessionInfo,
}: PurchaseSummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Resumen de Compra</h2>

      {/* Session Info */}
      {sessionInfo && (
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Sesión:</span>
            <span>{sessionInfo.date}</span>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded-full text-xs font-medium">
              {sessionInfo.pattern}
            </span>
          </div>
        </div>
      )}

      {/* Cards Summary */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">Cartones seleccionados:</span>
          <span className="font-semibold text-gray-900 dark:text-white">{selectedCardsCount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">Precio por cartón:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${pricePerCard.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-900 dark:text-white">Total a pagar:</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            ${totalAmount.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors">
        <p className="text-sm text-blue-800 dark:text-blue-400">
          <span className="font-medium">Nota:</span> Tu pago será revisado por un administrador. Los
          cartones serán asignados una vez aprobado el pago.
        </p>
      </div>
    </div>
  );
}
