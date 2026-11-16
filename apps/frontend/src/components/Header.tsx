/**
 * Header Component
 * Main navigation header with app branding and user profile/logout
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const displayName = profile?.nickname || profile?.email || profile?.phone || 'Usuario';
  const isAdmin = profile?.role === 'admin';

  return (
    <header className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-gray-800 dark:to-gray-900 shadow-lg transition-colors">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl transition-colors">
              🎱
            </div>
            <h1 className="text-2xl font-bold text-white hidden sm:block">Bingo Online</h1>
            <h1 className="text-xl font-bold text-white sm:hidden">Bingo</h1>
          </div>

          {/* Right Side: Theme Toggle + User Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Toggle dark mode"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>

            {/* User Profile Section */}
            {user && profile ? (
              <div className="relative">
                {/* Profile Button */}
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-lg font-medium transition-all hover:bg-white/10 text-white"
                  aria-label="User menu"
                  aria-expanded={showMenu}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                    {isAdmin ? '👨‍💼' : '🎮'}
                  </div>
                  <span className="hidden sm:block text-sm font-medium">{displayName}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`}
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
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                      aria-hidden="true"
                    />

                    {/* Menu Content */}
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-20 overflow-hidden transition-colors">
                      {/* User Info */}
                      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 transition-colors">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {profile.email || profile.phone}
                        </p>
                        <div className="mt-2">
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              isAdmin
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            }`}
                          >
                            {isAdmin ? 'Administrador' : 'Jugador'}
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {/* Admin Dashboard Link (only for admins) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              navigate('/admin/dashboard');
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                          >
                            <span className="text-lg">📊</span>
                            Panel de Administración
                          </button>
                        )}

                        {/* Home Link */}
                        <button
                          onClick={() => {
                            navigate('/');
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <span className="text-lg">🏠</span>
                          Sesiones Disponibles
                        </button>

                        {/* Player-only Links */}
                        {!isAdmin && (
                          <>
                            {/* My Payments Page Link */}
                            <button
                              onClick={() => {
                                navigate('/my-payments');
                                setShowMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <span className="text-lg">💳</span>
                              Mis Pagos
                            </button>

                            {/* Game Test Link */}
                            <button
                              onClick={() => {
                                navigate('/game-test');
                                setShowMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <span className="text-lg">🎮</span>
                              Prueba de Juego
                            </button>
                          </>
                        )}

                        {/* Logout */}
                        <button
                          onClick={handleLogout}
                          disabled={loading}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          aria-label="Logout"
                        >
                          <span className="text-lg">🚪</span>
                          {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Show login button if not logged in
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-white text-purple-600 dark:text-purple-700 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
