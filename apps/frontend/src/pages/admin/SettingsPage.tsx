/**
 * Settings Page
 * Admin interface for managing payment method configuration
 */

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { AdminNav } from '../../components/admin/AdminNav';
import { useAuth } from '../../contexts/AuthContext';

interface Setting {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export function SettingsPage() {
  const { session } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`${backendUrl}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const result = await response.json();
      setSettings(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(JSON.stringify(setting.value, null, 2));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue(null);
  };

  const saveEdit = async () => {
    if (!editingKey) return;

    try {
      const token = session?.access_token;
      if (!token) throw new Error('No authentication token');

      const parsedValue = JSON.parse(editValue);

      const response = await fetch(`${backendUrl}/api/admin/settings/${editingKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value: parsedValue }),
      });

      if (!response.ok) throw new Error('Failed to update setting');

      setSuccess('Setting updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      setEditingKey(null);
      setEditValue(null);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating setting');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <AdminNav />

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Payment Method Configuration
        </h1>

        <div className="mb-6 p-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-lg transition-colors">
          <p className="text-sm">
            Configure payment method credentials. These will replace environment variables for
            production deployment.
          </p>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg transition-colors">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg transition-colors">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            {settings.map((setting) => (
              <div
                key={setting.key}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {setting.key}
                    </h3>
                    {setting.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {setting.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last updated: {new Date(setting.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {editingKey !== setting.key && (
                    <button
                      onClick={() => startEdit(setting)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {editingKey === setting.key ? (
                  <div className="space-y-3">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full h-40 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded font-mono text-sm transition-colors"
                      placeholder="Enter JSON value..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto text-gray-900 dark:text-gray-300 transition-colors">
                    {JSON.stringify(setting.value, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
