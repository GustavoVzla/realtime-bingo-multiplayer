/**
 * MyPaymentsPage - Payment history for players
 * Shows all payments (pending, approved, rejected) with details
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

interface Payment {
  id: string;
  session_id: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  selected_cards: string[];
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  admin_notes?: string;
  bingo_sessions?: {
    scheduled_at: string;
    pattern: string;
    price_per_card: number;
    status: string;
    room_id: string | null;
  };
}

export function MyPaymentsPage() {
  const { session: authSession } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = authSession?.access_token;

      const response = await fetch(`${backendUrl}/api/payments/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-sm font-medium">
            ⏳ Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm font-medium">
            ✅ Aprobado
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-sm font-medium">
            ❌ Rechazado
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded-full text-sm font-medium">
            {status}
          </span>
        );
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pago_movil: 'Pago Móvil',
      zelle: 'Zelle',
      binance_usdt: 'USDT (Binance)',
      bizum: 'Bizum',
      cash: 'Efectivo',
    };
    return labels[method] || method;
  };

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando pagos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">💳 Mis Pagos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Historial de todos tus pagos y su estado
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Todos ({payments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Pendientes ({payments.filter((p) => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Aprobados ({payments.filter((p) => p.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            Rechazados ({payments.filter((p) => p.status === 'rejected').length})
          </button>
        </div>

        {/* Payment List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center transition-colors">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay pagos {filter !== 'all' && filter}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {filter === 'all'
                ? 'Aún no has realizado ningún pago.'
                : `No tienes pagos ${filter}.`}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ver Sesiones Disponibles
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </h3>
                        {getStatusBadge(payment.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payment.created_at).toLocaleString('es-ES', {
                          dateStyle: 'long',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{payment.currency}</p>
                    </div>
                  </div>

                  {/* Session Info */}
                  {payment.bingo_sessions && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Sesión de Bingo
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Fecha:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(payment.bingo_sessions.scheduled_at).toLocaleString('es-ES', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Patrón:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {payment.bingo_sessions.pattern}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Precio/carta:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${payment.bingo_sessions.price_per_card}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Cartas:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {payment.selected_cards.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Notes (if rejected) */}
                  {payment.status === 'rejected' && payment.admin_notes && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                      <p className="font-semibold text-red-900 dark:text-red-400 mb-1">
                        Motivo del rechazo:
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-300">
                        {payment.admin_notes}
                      </p>
                    </div>
                  )}

                  {/* Approved Date */}
                  {payment.status === 'approved' && payment.approved_at && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-800 dark:text-green-400">
                        ✅ Aprobado el{' '}
                        {new Date(payment.approved_at).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {payment.status === 'approved' &&
                      payment.bingo_sessions?.status === 'active' &&
                      payment.bingo_sessions?.room_id && (
                        <button
                          onClick={() => navigate(`/game/${payment.session_id}`)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          🎮 Ir al Juego
                        </button>
                      )}
                    <button
                      onClick={() => navigate(`/session/${payment.session_id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      💳 Comprar Cartones
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
