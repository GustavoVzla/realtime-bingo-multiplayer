import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BizumData, BizumDataSchema } from '@bingo/shared-types';
import { getLocalDateString, getMaxDateString } from '../../../lib/dateUtils';

interface BizumFormProps {
  expectedAmount: number;
  onSubmit: (data: BizumData) => void;
}

export function BizumForm({ expectedAmount, onSubmit }: BizumFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BizumData>({
    resolver: zodResolver(BizumDataSchema),
    defaultValues: {
      monto: expectedAmount,
      fecha: getLocalDateString(),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Teléfono Origen *</label>
        <input
          {...register('telefono')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="+34..."
        />
        {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Código de Operación *</label>
        <input
          {...register('codigoOperacion')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Código de la operación"
        />
        {errors.codigoOperacion && (
          <p className="text-red-500 text-xs mt-1">{errors.codigoOperacion.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monto (EUR) *</label>
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
