/**
 * PaymentStatusBadge Component
 *
 * Visual badge for payment status (pending, approved, rejected)
 */

import { PaymentStatus } from '@bingo/shared-types';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case PaymentStatus.PENDING:
        return {
          label: 'Pendiente',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      case PaymentStatus.APPROVED:
        return {
          label: 'Aprobado',
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case PaymentStatus.REJECTED:
        return {
          label: 'Rechazado',
          className: 'bg-red-100 text-red-800 border-red-300',
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
