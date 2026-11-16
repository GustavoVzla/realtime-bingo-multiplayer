/**
 * PaymentFormContainer - Main payment flow orchestrator
 *
 * Handles the complete payment process:
 * 1. Select payment method
 * 2. Show payment instructions
 * 3. Fill payment details form
 * 4. Submit payment request
 */

import { useState } from 'react';
import { PaymentMethod, PaymentData } from '@bingo/shared-types';
import { useCreatePayment } from '../../hooks/usePayments';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentInstructionsCard } from './PaymentInstructionsCard';
import { PagoMovilForm } from './forms/PagoMovilForm';
import { ZelleForm } from './forms/ZelleForm';
import { USDTBinanceForm } from './forms/USDTBinanceForm';
import { BizumForm } from './forms/BizumForm';
import { EfectivoForm } from './forms/EfectivoForm';

interface PaymentFormContainerProps {
  sessionId: string;
  cardIds: string[];
  pricePerCard: number;
  onSuccess?: (paymentId?: string) => void;
  onError?: (error: Error) => void;
}

export function PaymentFormContainer({
  sessionId,
  cardIds,
  pricePerCard,
  onSuccess,
  onError,
}: PaymentFormContainerProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const createPayment = useCreatePayment();

  const totalAmount = cardIds.length * pricePerCard;

  const handleSubmit = async (paymentData: PaymentData) => {
    try {
      const result = await createPayment.mutateAsync({
        sessionId,
        cardIds,
        paymentMethod: selectedMethod!,
        paymentData,
      });

      // Call success callback with payment ID
      onSuccess?.(result?.id);
    } catch (error: any) {
      // Call error callback
      onError?.(error);
    }
  };

  const renderPaymentForm = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod) {
      case PaymentMethod.PAGO_MOVIL:
        return <PagoMovilForm expectedAmount={totalAmount} onSubmit={handleSubmit} />;
      case PaymentMethod.ZELLE:
        return <ZelleForm expectedAmount={totalAmount} onSubmit={handleSubmit} />;
      case PaymentMethod.USDT_BINANCE:
        return <USDTBinanceForm expectedAmount={totalAmount} onSubmit={handleSubmit} />;
      case PaymentMethod.BIZUM:
        return <BizumForm expectedAmount={totalAmount} onSubmit={handleSubmit} />;
      case PaymentMethod.EFECTIVO:
        return <EfectivoForm onSubmit={handleSubmit} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Payment Method */}
      <PaymentMethodSelector selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

      {/* Step 2: Show Instructions & Form */}
      {selectedMethod && (
        <div className="space-y-6">
          <PaymentInstructionsCard method={selectedMethod} />

          {/* Step 3: Fill Form */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Datos de tu Pago</h3>
            {renderPaymentForm()}
          </div>
        </div>
      )}
    </div>
  );
}
