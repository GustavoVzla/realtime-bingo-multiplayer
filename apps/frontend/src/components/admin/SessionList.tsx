/**
 * Session List Component
 * Displays a grid of session cards
 */

import { SessionListItem } from '@bingo/shared-types';
import { SessionCard as AdminSessionCard } from './AdminSessionCard';

interface SessionListProps {
  sessions: SessionListItem[];
  loading: boolean;
  onEdit: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSessionClick: (sessionId: string) => void;
}

export function SessionList({
  sessions,
  loading,
  onEdit,
  onDelete,
  onSessionClick,
}: SessionListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Cargando sesiones...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center transition-colors">
        <div className="text-6xl mb-4">🎲</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No hay sesiones
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Aún no hay sesiones de bingo programadas. Crea tu primera sesión para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sessions.map((session) => (
        <AdminSessionCard
          key={session.id}
          session={session}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onSessionClick}
        />
      ))}
    </div>
  );
}
