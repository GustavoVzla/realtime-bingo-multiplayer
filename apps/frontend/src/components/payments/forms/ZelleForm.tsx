import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZelleData, ZelleDataSchema } from '@bingo/shared-types';
import { getLocalDateString, getMaxDateString } from '../../../lib/dateUtils';

interface ZelleFormProps {
  expectedAmount: number;
  onSubmit: (data: ZelleData) => void;
}

export function ZelleForm({ expectedAmount, onSubmit }: ZelleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ZelleData>({
    resolver: zodResolver(ZelleDataSchema),
    defaultValues: {
      monto: expectedAmount,
      fecha: getLocalDateString(),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Email o Teléfono usado *</label>
        <input
          {...register('emailOrPhone')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="tu@email.com o +1234567890"
        />
        {errors.emailOrPhone && (
          <p className="text-red-500 text-xs mt-1">{errors.emailOrPhone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Número de Confirmación *</label>
        <input
          {...register('confirmationNumber')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Confirmation #"
        />
        {errors.confirmationNumber && (
          <p className="text-red-500 text-xs mt-1">{errors.confirmationNumber.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monto (USD) *</label>
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
