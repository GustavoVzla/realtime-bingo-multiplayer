/**
 * User Profile Component
 * Displays user info and logout button
 */

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function UserProfile() {
  const { profile, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const displayName = profile.nickname || profile.email || profile.phone || 'Usuario';

  return (
    <div className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isAdmin
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
          {isAdmin ? '👨‍💼' : '🎮'}
        </div>
        <span className="hidden sm:block">{displayName}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />

          {/* Menu Content */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-20 overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{profile.email || profile.phone}</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                    isAdmin ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {isAdmin ? 'Administrador' : 'Jugador'}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cerrando sesión...' : '🚪 Cerrar Sesión'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
