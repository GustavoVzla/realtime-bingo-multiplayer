import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EfectivoData, EfectivoDataSchema } from '@bingo/shared-types';

interface EfectivoFormProps {
  onSubmit: (data: EfectivoData) => void;
}

export function EfectivoForm({ onSubmit }: EfectivoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EfectivoData>({
    resolver: zodResolver(EfectivoDataSchema),
    defaultValues: {
      nota: 'Solicito coordinar pago en efectivo',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> El pago en efectivo requiere coordinación presencial con el
          administrador. Tu solicitud quedará pendiente hasta la confirmación del pago.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Nota / Forma de contacto (Opcional)
        </label>
        <textarea
          {...register('nota')}
          className="w-full px-3 py-2 border rounded-lg"
          rows={4}
          placeholder="Agrega información adicional para coordinar el pago..."
        />
        {errors.nota && <p className="text-red-500 text-xs mt-1">{errors.nota.message}</p>}
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
