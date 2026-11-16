/**
 * Session Filters Component
 * Provides filtering controls for session list
 */

import { BingoPattern, SessionStatus } from '@bingo/shared-types';

interface SessionFiltersProps {
  filters: {
    status?: SessionStatus;
    pattern?: BingoPattern;
    date_from?: string;
    date_to?: string;
  };
  onFiltersChange: (filters: {
    status?: SessionStatus;
    pattern?: BingoPattern;
    date_from?: string;
    date_to?: string;
  }) => void;
}

export function SessionFilters({ filters, onFiltersChange }: SessionFiltersProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      status: value ? (value as SessionStatus) : undefined,
    });
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      pattern: value ? (value as BingoPattern) : undefined,
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      date_from: e.target.value || undefined,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      date_to: e.target.value || undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.status || filters.pattern || filters.date_from || filters.date_to;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label
            htmlFor="status-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Estado
          </label>
          <select
            id="status-filter"
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value={SessionStatus.SCHEDULED}>Programada</option>
            <option value={SessionStatus.ACTIVE}>Activa</option>
            <option value={SessionStatus.COMPLETED}>Completada</option>
            <option value={SessionStatus.CANCELLED}>Cancelada</option>
          </select>
        </div>

        {/* Pattern Filter */}
        <div>
          <label
            htmlFor="pattern-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Patrón
          </label>
          <select
            id="pattern-filter"
            value={filters.pattern || ''}
            onChange={handlePatternChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <option value="">Todos los patrones</option>
            <option value={BingoPattern.HORIZONTAL}>Horizontal</option>
            <option value={BingoPattern.VERTICAL}>Vertical</option>
            <option value={BingoPattern.DIAGONAL}>Diagonal</option>
            <option value={BingoPattern.L_SHAPE}>Forma L</option>
            <option value={BingoPattern.M_SHAPE}>Forma M</option>
            <option value={BingoPattern.O_SHAPE}>Forma O</option>
            <option value={BingoPattern.X_SHAPE}>Forma X</option>
            <option value={BingoPattern.FOUR_CORNERS}>4 Esquinas</option>
            <option value={BingoPattern.FULL_CARD}>Cartón Lleno</option>
          </select>
        </div>

        {/* Date From Filter */}
        <div>
          <label
            htmlFor="date-from-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Desde
          </label>
          <input
            type="date"
            id="date-from-filter"
            value={filters.date_from || ''}
            onChange={handleDateFromChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Date To Filter */}
        <div>
          <label
            htmlFor="date-to-filter"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Hasta
          </label>
          <input
            type="date"
            id="date-to-filter"
            value={filters.date_to || ''}
            onChange={handleDateToChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
