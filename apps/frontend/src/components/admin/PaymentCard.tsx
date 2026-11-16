/**
 * PaymentCard Component
 * Displays payment transaction details with approve/reject actions for admins
 */

import { useState } from 'react';
import { PaymentWithDetails } from '@bingo/shared-types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentCardProps {
  payment: PaymentWithDetails;
  onApprove: (paymentId: string, adminNotes?: string) => Promise<void>;
  onReject: (paymentId: string, reason: string) => Promise<void>;
}

export function PaymentCard({ payment, onApprove, onReject }: PaymentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveInput, setShowApproveInput] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  const isPending = payment.status === 'pending';

  const getStatusBadge = () => {
    switch (payment.status) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pago_movil: 'Pago Móvil',
      zelle: 'Zelle',
      usdt_binance: 'USDT Binance',
      bizum: 'Bizum',
      efectivo: 'Efectivo',
    };
    return labels[method] || method;
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await onApprove(payment.id, adminNotes || undefined);
      setShowApproveInput(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Error approving payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Por favor ingresa una razón para rechazar el pago');
      return;
    }
    setIsLoading(true);
    try {
      await onReject(payment.id, rejectReason);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {payment.player?.email || 'Usuario desconocido'}
              </h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge()}`}>
                {payment.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                <span className="font-medium">Método:</span>{' '}
                {getPaymentMethodLabel(payment.payment_method)}
              </p>
              <p>
                <span className="font-medium">Monto:</span> {payment.amount} {payment.currency}
              </p>
              <p>
                <span className="font-medium">Fecha:</span> {formatDate(payment.created_at)}
              </p>
            </div>
          </div>
          <div className="ml-4">
            <svg
              className={`w-6 h-6 text-gray-400 dark:text-gray-500 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 transition-colors">
          <div className="p-4 space-y-4">
            {/* Player Info */}
            {payment.player && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Información del Jugador
                </h4>
                <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm space-y-1 text-gray-900 dark:text-gray-200 transition-colors">
                  <p>
                    <span className="font-medium">Email:</span> {payment.player.email}
                  </p>
                  {payment.player.nickname && (
                    <p>
                      <span className="font-medium">Nickname:</span> {payment.player.nickname}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Session Info */}
            {payment.session && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Información de la Sesión
                </h4>
                <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm space-y-1 text-gray-900 dark:text-gray-200 transition-colors">
                  <p>
                    <span className="font-medium">Fecha:</span>{' '}
                    {formatDate(payment.session.date_time)}
                  </p>
                  <p>
                    <span className="font-medium">Patrón:</span> {payment.session.winning_pattern}
                  </p>
                  <p>
                    <span className="font-medium">Precio por cartón:</span> $
                    {payment.session.card_price}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Data */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                Datos del Pago
              </h4>
              <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm space-y-1 text-gray-900 dark:text-gray-200 transition-colors">
                {Object.entries(payment.payment_data).map(([key, value]) => (
                  <p key={key}>
                    <span className="font-medium capitalize">{key}:</span>{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                ))}
              </div>
            </div>

            {/* Selected Cards */}
            {payment.selected_cards && payment.selected_cards.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Cartones Seleccionados
                </h4>
                <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm text-gray-900 dark:text-gray-200 transition-colors">
                  <p>{payment.selected_cards.length} cartones</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {payment.selected_cards.map((cardId, index) => (
                      <span
                        key={cardId}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded text-xs"
                      >
                        Cartón {index + 1}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Notes (if approved/rejected) */}
            {payment.admin_notes && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Notas del Administrador
                </h4>
                <div className="bg-white dark:bg-gray-700 rounded p-3 text-sm text-gray-900 dark:text-gray-200 transition-colors">
                  <p>{payment.admin_notes}</p>
                </div>
              </div>
            )}

            {/* Approval/Rejection Info */}
            {payment.approved_at && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-sm transition-colors">
                <p className="text-green-800 dark:text-green-400">
                  <span className="font-medium">Aprobado el:</span>{' '}
                  {formatDate(payment.approved_at)}
                </p>
                {payment.approved_by && (
                  <p className="text-green-800 dark:text-green-400 mt-1">
                    <span className="font-medium">Aprobado por:</span> {payment.approved_by}
                  </p>
                )}
              </div>
            )}

            {payment.rejected_at && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 text-sm transition-colors">
                <p className="text-red-800 dark:text-red-400">
                  <span className="font-medium">Rechazado el:</span>{' '}
                  {formatDate(payment.rejected_at)}
                </p>
              </div>
            )}

            {/* Action Buttons (only if pending) */}
            {isPending && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {/* Approve Section */}
                {!showApproveInput ? (
                  <button
                    onClick={() => {
                      setShowApproveInput(true);
                      setShowRejectInput(false);
                    }}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Aprobar Pago
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Notas del administrador (opcional)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-colors"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleApprove}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {isLoading ? 'Aprobando...' : 'Confirmar Aprobación'}
                      </button>
                      <button
                        onClick={() => {
                          setShowApproveInput(false);
                          setAdminNotes('');
                        }}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject Section */}
                {!showRejectInput ? (
                  <button
                    onClick={() => {
                      setShowRejectInput(true);
                      setShowApproveInput(false);
                    }}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Rechazar Pago
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Razón del rechazo (obligatorio)"
                      className="w-full px-3 py-2 border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm transition-colors"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReject}
                        disabled={isLoading || !rejectReason.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        {isLoading ? 'Rechazando...' : 'Confirmar Rechazo'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectInput(false);
                          setRejectReason('');
                        }}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
