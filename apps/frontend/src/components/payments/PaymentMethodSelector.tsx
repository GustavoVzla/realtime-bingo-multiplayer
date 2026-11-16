import { PaymentMethod } from '@bingo/shared-types';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

const paymentMethods = [
  {
    value: PaymentMethod.PAGO_MOVIL,
    label: 'Pago Móvil',
    description: 'Venezuela (Bs)',
    icon: '🇻🇪',
  },
  {
    value: PaymentMethod.ZELLE,
    label: 'Zelle',
    description: 'USA (USD)',
    icon: '🇺🇸',
  },
  {
    value: PaymentMethod.USDT_BINANCE,
    label: 'USDT (Binance)',
    description: 'Crypto (USDT)',
    icon: '₮',
  },
  {
    value: PaymentMethod.BIZUM,
    label: 'Bizum',
    description: 'España (EUR)',
    icon: '🇪🇸',
  },
  {
    value: PaymentMethod.EFECTIVO,
    label: 'Efectivo',
    description: 'Presencial',
    icon: '💵',
  },
];

export function PaymentMethodSelector({ selectedMethod, onSelect }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Selecciona el método de pago
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {paymentMethods.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onSelect(method.value)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              selectedMethod === method.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{method.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{method.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{method.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
