import { useState } from 'react';
import { PaymentMethod } from '@bingo/shared-types';
import { usePaymentInstructions } from '../../hooks/usePayments';

interface PaymentInstructionsCardProps {
  method: PaymentMethod;
}

export function PaymentInstructionsCard({ method }: PaymentInstructionsCardProps) {
  const { data: instructions, isLoading } = usePaymentInstructions(method);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Cargando instrucciones...</div>;
  }

  if (!instructions) {
    return null;
  }

  const renderInstructions = () => {
    switch (instructions.method) {
      case PaymentMethod.PAGO_MOVIL:
        return (
          <>
            <InstructionField
              label="Teléfono"
              value={instructions.phone}
              onCopy={() => copyToClipboard(instructions.phone, 'phone')}
              copied={copiedField === 'phone'}
            />
            <InstructionField
              label="Cédula"
              value={instructions.cedula}
              onCopy={() => copyToClipboard(instructions.cedula, 'cedula')}
              copied={copiedField === 'cedula'}
            />
            <InstructionField
              label="Banco"
              value={instructions.banco}
              onCopy={() => copyToClipboard(instructions.banco, 'banco')}
              copied={copiedField === 'banco'}
            />
            <InstructionField
              label="Titular"
              value={instructions.titular}
              onCopy={() => copyToClipboard(instructions.titular, 'titular')}
              copied={copiedField === 'titular'}
            />
          </>
        );

      case PaymentMethod.ZELLE:
        return (
          <>
            <InstructionField
              label="Email"
              value={instructions.email}
              onCopy={() => copyToClipboard(instructions.email, 'email')}
              copied={copiedField === 'email'}
            />
            <InstructionField
              label="Titular"
              value={instructions.titular}
              onCopy={() => copyToClipboard(instructions.titular, 'titular')}
              copied={copiedField === 'titular'}
            />
          </>
        );

      case PaymentMethod.USDT_BINANCE:
        return (
          <>
            <InstructionField
              label="Email"
              value={instructions.email}
              onCopy={() => copyToClipboard(instructions.email, 'email')}
              copied={copiedField === 'email'}
            />
            <InstructionField
              label="Red"
              value={instructions.network}
              onCopy={() => copyToClipboard(instructions.network, 'network')}
              copied={copiedField === 'network'}
            />
          </>
        );

      case PaymentMethod.BIZUM:
        return (
          <>
            <InstructionField
              label="Teléfono"
              value={instructions.phone}
              onCopy={() => copyToClipboard(instructions.phone, 'phone')}
              copied={copiedField === 'phone'}
            />
            <InstructionField
              label="Titular"
              value={instructions.titular}
              onCopy={() => copyToClipboard(instructions.titular, 'titular')}
              copied={copiedField === 'titular'}
            />
          </>
        );

      case PaymentMethod.EFECTIVO:
        return (
          <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
            {instructions.nota}
          </div>
        );
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-lg">Datos para realizar el pago</h3>
      <div className="space-y-2">{renderInstructions()}</div>
    </div>
  );
}

interface InstructionFieldProps {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}

function InstructionField({ label, value, onCopy, copied }: InstructionFieldProps) {
  return (
    <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-mono font-medium">{value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
