import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PagoMovilData, PagoMovilDataSchema } from '@bingo/shared-types';
import { getLocalDateString, getMaxDateString } from '../../../lib/dateUtils';

interface PagoMovilFormProps {
  expectedAmount: number;
  onSubmit: (data: PagoMovilData) => void;
}

export function PagoMovilForm({ expectedAmount, onSubmit }: PagoMovilFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PagoMovilData>({
    resolver: zodResolver(PagoMovilDataSchema),
    defaultValues: {
      monto: expectedAmount,
      banco: 'Banesco',
      fecha: getLocalDateString(),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Número de Referencia *</label>
        <input
          {...register('referencia')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Últimos 4-6 dígitos"
        />
        {errors.referencia && (
          <p className="text-red-500 text-xs mt-1">{errors.referencia.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Banco *</label>
        <select {...register('banco')} className="w-full px-3 py-2 border rounded-lg">
          <option value="Banesco">Banesco</option>
          <option value="Mercantil">Mercantil</option>
          <option value="Venezuela">Venezuela</option>
          <option value="Provincial">Provincial</option>
          <option value="BNC">BNC</option>
        </select>
        {errors.banco && <p className="text-red-500 text-xs mt-1">{errors.banco.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monto (Bs) *</label>
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
        <label className="block text-sm font-medium mb-1">Teléfono Origen *</label>
        <input
          {...register('telefono')}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="+584121234567"
        />
        {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
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
