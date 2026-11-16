/**
 * ⚠️ DEPRECATED FILE - DO NOT USE
 *
 * This file was deprecated on 2025-11-07 as part of ARCH-001 consolidation.
 *
 * **Reason for deprecation:**
 * The standalone "Salas Activas" page caused architectural inconsistencies:
 * - Same session data displayed differently across multiple routes
 * - Confusing navigation (rooms managed separately from sessions)
 * - Code duplication (same fetches in multiple components)
 *
 * **Replacement:**
 * Use the hierarchical navigation instead:
 *
 * /admin/sessions → View all sessions with room info
 *   └─> /admin/sessions/:sessionId/rooms → View session details + all rooms
 *        └─> /admin/sessions/:sessionId/rooms/:roomId/control → Control specific room
 *
 * **Original file preserved at:**
 * apps/frontend/src/pages/admin/RoomsPage.tsx.deprecated
 *
 * **For more information, see:**
 * - docs/PENDING-TASKS.md (Task 0: ARCH-001)
 * - docs/reports/CONSOLIDATION-IMPLEMENTATION-REPORT-2025-11-07.md (pending creation)
 *
 * **Date deprecated:** 2025-11-07
 * **Issue ID:** ARCH-001
 */

export function RoomsPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Página Deprecada
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Esta página ha sido deprecada. Por favor, usa la navegación jerárquica:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 mb-6 text-left">
            <p className="font-mono text-sm text-gray-800 dark:text-gray-200 mb-2">
              /admin/sessions
            </p>
            <p className="font-mono text-sm text-gray-800 dark:text-gray-200 ml-4 mb-2">
              └─{'>'} /admin/sessions/:sessionId/rooms
            </p>
            <p className="font-mono text-sm text-gray-800 dark:text-gray-200 ml-8">
              └─{'>'} /admin/sessions/:sessionId/rooms/:roomId/control
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/admin/sessions'}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Ir a Sesiones
          </button>
        </div>
      </div>
    </div>
  );
}
