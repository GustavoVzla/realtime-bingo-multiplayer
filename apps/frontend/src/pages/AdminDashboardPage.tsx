/**
 * Admin Dashboard Page
 * Manage pending payment transactions with real-time updates
 */

import { useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { AdminNav } from '../components/admin/AdminNav';
import { PaymentCard } from '../components/admin/PaymentCard';
import { useAllPayments, useApprovePayment, useRejectPayment } from '../hooks/usePayments';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export function AdminDashboardPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all payments with filters using React Query
  const { data: payments = [], isLoading: loading, error: queryError } = useAllPayments();

  // Mutations for approve/reject
  const approveMutation = useApprovePayment();
  const rejectMutation = useRejectPayment();

  const error = queryError ? String(queryError) : null;

  // Handle approve payment using mutation
  const handleApprove = async (paymentId: string, adminNotes?: string) => {
    try {
      await approveMutation.mutateAsync({ paymentId, adminNotes });
      setSuccessMessage('Pago aprobado exitosamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error approving payment:', err);
    }
  };

  // Handle reject payment using mutation
  const handleReject = async (paymentId: string, reason: string) => {
    try {
      await rejectMutation.mutateAsync({ paymentId, adminNotes: reason });
      setSuccessMessage('Pago rechazado');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error rejecting payment:', err);
    }
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      // Search filter (by player email)
      if (searchTerm && payment.player?.email) {
        return payment.player.email.toLowerCase().includes(searchTerm.toLowerCase());
      }

      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: payments.length,
      pending: payments.filter((p) => p.status === 'pending').length,
      approved: payments.filter((p) => p.status === 'approved').length,
      rejected: payments.filter((p) => p.status === 'rejected').length,
    };
  }, [payments]);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendientes' },
    { key: 'approved', label: 'Aprobados' },
    { key: 'rejected', label: 'Rechazados' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <AdminNav />
      {/* Admin navigation for payments and sessions */}

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Panel de Administración
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión de pagos pendientes y aprobación de cartones
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors">
            <span className="text-xl">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors">
            <span className="text-xl">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    statusFilter === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full transition-colors ${
                      statusFilter === tab.key
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {statusCounts[tab.key]}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por email del jugador..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando pagos...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredPayments.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center transition-colors">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay pagos
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? 'No se encontraron pagos con ese criterio de búsqueda'
                : statusFilter === 'all'
                  ? 'Aún no hay pagos registrados'
                  : `No hay pagos ${
                      statusFilter === 'pending'
                        ? 'pendientes'
                        : statusFilter === 'approved'
                          ? 'aprobados'
                          : 'rechazados'
                    }`}
            </p>
          </div>
        )}

        {/* Payment List */}
        {!loading && filteredPayments.length > 0 && (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
