import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { USDTBinanceData, USDTBinanceDataSchema } from '@bingo/shared-types';
import { getLocalDateString, getMaxDateString } from '../../../lib/dateUtils';

interface USDTBinanceFormProps {
  expectedAmount: number;
  onSubmit: (data: USDTBinanceData) => void;
}

export function USDTBinanceForm({ expectedAmount, onSubmit }: USDTBinanceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<USDTBinanceData>({
    resolver: zodResolver(USDTBinanceDataSchema),
    defaultValues: {
      monto: expectedAmount,
      fecha: getLocalDateString(),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Transaction ID (TxID) *</label>
        <input
          {...register('txId')}
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          placeholder="0x..."
        />
        {errors.txId && <p className="text-red-500 text-xs mt-1">{errors.txId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monto (USDT) *</label>
        <input
          {...register('monto', { valueAsNumber: true })}
          type="number"
          step="0.01"
          className="w-full px-3 py-2 border rounded-lg"
          readOnly
        />
        {errors.monto && <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Fecha *</label>
        <input
          {...register('fecha')}
          type="date"
          max={getMaxDateString()}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.fecha && <p className="text-red-500 text-xs mt-1">{errors.fecha.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Wallet Origen (Opcional)</label>
        <input
          {...register('wallet')}
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          placeholder="Tu dirección de wallet"
        />
        {errors.wallet && <p className="text-red-500 text-xs mt-1">{errors.wallet.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Procesando...' : 'Enviar Solicitud'}
      </button>
    </form>
  );
}
