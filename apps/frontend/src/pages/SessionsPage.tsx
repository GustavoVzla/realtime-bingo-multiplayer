/**
 * Sessions Page
 * Admin page for managing bingo sessions with full CRUD operations
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminSessionResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  BingoPattern,
  SessionStatus,
  ApiResponse,
} from '@bingo/shared-types';
import { Header } from '../components/Header';
import { AdminNav } from '../components/admin/AdminNav';
import { SessionFilters } from '../components/admin/SessionFilters';
import { SessionList } from '../components/admin/SessionList';
import { SessionFormModal } from '../components/admin/SessionFormModal';
import { DeleteConfirmationModal } from '../components/admin/DeleteConfirmationModal';
import { useAuth } from '../contexts/AuthContext';

export function SessionsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AdminSessionResponse | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters from URL params
  // Use nullish coalescing (??) to normalize null to undefined
  const filters = {
    status: (searchParams.get('status') ?? undefined) as SessionStatus | undefined,
    pattern: (searchParams.get('pattern') ?? undefined) as BingoPattern | undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
    page: parseInt(searchParams.get('page') || '1'),
    page_size: parseInt(searchParams.get('page_size') || '20'),
  };

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Fetch sessions
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['admin-sessions', filters],
    queryFn: async () => {
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.pattern) params.append('pattern', filters.pattern);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await fetch(`${backendUrl}/api/admin/sessions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar sesiones');
      }

      const result = await response.json();
      // Backend returns: { success: true, data: [...sessions...], pagination: {...} }
      // We need to restructure it to match PaginatedResponse format
      return {
        data: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        hasMore: result.pagination.hasMore,
      };
    },
    enabled: !!session?.access_token,
  });

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateSessionRequest) => {
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${backendUrl}/api/admin/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear sesión');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setSuccessMessage('Sesión creada exitosamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Update session mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSessionRequest }) => {
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${backendUrl}/api/admin/sessions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar sesión');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setEditingSession(null);
      setSuccessMessage('Sesión actualizada exitosamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${backendUrl}/api/admin/sessions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar sesión');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setDeletingSessionId(null);
      // Use the message from backend (handles soft/hard delete distinction)
      const message =
        data?.data?.deletion_type === 'soft'
          ? 'Sesión cancelada exitosamente'
          : 'Sesión eliminada exitosamente';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Fetch single session for editing
  const fetchSessionForEdit = async (sessionId: string) => {
    const token = session?.access_token;
    if (!token) return;

    try {
      const response = await fetch(`${backendUrl}/api/admin/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar sesión');

      const result: ApiResponse<AdminSessionResponse> = await response.json();
      if (result.data) {
        setEditingSession(result.data);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setErrorMessage('Error al cargar los detalles de la sesión');
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Handlers
  const handleFiltersChange = (newFilters: {
    status?: SessionStatus;
    pattern?: BingoPattern;
    date_from?: string;
    date_to?: string;
  }) => {
    const params = new URLSearchParams(searchParams);

    // Define all possible filter keys
    const filterKeys = ['status', 'pattern', 'date_from', 'date_to'];

    // If newFilters is empty (clear filters case), remove all filter params
    if (Object.keys(newFilters).length === 0) {
      filterKeys.forEach((key) => params.delete(key));
    } else {
      // Update or remove filter params based on newFilters
      filterKeys.forEach((key) => {
        const value = newFilters[key as keyof typeof newFilters];
        if (value != null && value !== '') {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });
    }

    // Reset to page 1 when filters change
    params.set('page', '1');

    setSearchParams(params);
  };

  const handleCreateSession = async (data: CreateSessionRequest | UpdateSessionRequest) => {
    await createMutation.mutateAsync(data as CreateSessionRequest);
    setIsCreateModalOpen(false);
  };

  const handleEditSession = (sessionId: string) => {
    fetchSessionForEdit(sessionId);
  };

  const handleUpdateSession = async (data: CreateSessionRequest | UpdateSessionRequest) => {
    if (!editingSession) return;
    await updateMutation.mutateAsync({ id: editingSession.id, data: data as UpdateSessionRequest });
  };

  const handleDeleteSession = (sessionId: string) => {
    setDeletingSessionId(sessionId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSessionId) return;
    await deleteMutation.mutateAsync(deletingSessionId);
  };

  const handleSessionClick = (sessionId: string) => {
    // Navigate to session detail page (to be implemented)
    console.log('Navigate to session:', sessionId);
    // navigate(`/admin/sessions/${sessionId}`);
  };

  const handleRoomCreated = () => {
    // Invalidate and refetch sessions when a room is created
    queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
  };

  const sessions = sessionsData?.data || [];
  const totalPages = sessionsData ? Math.ceil(sessionsData.total / sessionsData.pageSize) : 1;
  const currentPage = filters.page || 1;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <AdminNav />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Gestión de Sesiones
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra las sesiones de bingo programadas
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Crear Sesión
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors">
            <span className="text-xl">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors">
            <span className="text-xl">⚠</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filters */}
        <SessionFilters
          filters={{
            status: filters.status,
            pattern: filters.pattern,
            date_from: filters.date_from,
            date_to: filters.date_to,
          }}
          onFiltersChange={handleFiltersChange}
        />

        {/* Session List */}
        <SessionList
          sessions={sessions}
          loading={isLoading}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onSessionClick={handleSessionClick}
          onRoomCreated={handleRoomCreated}
        />

        {/* Pagination */}
        {!isLoading && sessions.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => handleFiltersChange({ ...filters, page: currentPage - 1 } as any)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handleFiltersChange({ ...filters, page: currentPage + 1 } as any)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <SessionFormModal
        isOpen={isCreateModalOpen}
        mode="create"
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSession}
        loading={createMutation.isPending}
      />

      {/* Edit Modal */}
      {editingSession && (
        <SessionFormModal
          isOpen={true}
          mode="edit"
          initialData={{
            id: editingSession.id,
            date_time: editingSession.date_time,
            card_price: editingSession.card_price,
            max_cards_per_player: editingSession.max_cards_per_player,
            winning_pattern: editingSession.winning_pattern,
            prize_amount: editingSession.prize_amount,
            description: editingSession.description,
            status: editingSession.status,
            rooms: editingSession.rooms, // ADDED: Pass rooms to modal
          }}
          onClose={() => setEditingSession(null)}
          onSubmit={handleUpdateSession}
          loading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deletingSessionId !== null}
        onClose={() => setDeletingSessionId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
        message="¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer."
      />
    </div>
  );
}
