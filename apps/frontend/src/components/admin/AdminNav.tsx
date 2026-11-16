/**
 * AdminNav Component
 * Navigation menu for admin sections
 */

import { useNavigate, useLocation } from 'react-router-dom';

export function AdminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      path: '/admin/payments',
      label: 'Pagos',
      icon: '💳',
      description: 'Gestión de pagos y aprobación de cartones',
    },
    {
      path: '/admin/sessions',
      label: 'Sesiones',
      icon: '🎯',
      description: 'Crear y gestionar sesiones de bingo',
    },
    {
      path: '/admin/users',
      label: 'Usuarios',
      icon: '👥',
      description: 'Gestionar roles de usuarios',
    },
    {
      path: '/admin/settings',
      label: 'Configuración',
      icon: '⚙️',
      description: 'Configurar métodos de pago',
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive(item.path)
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
