/**
 * OAuth Callback Page
 * Handles the redirect after OAuth authentication (Google/Facebook)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (data.session) {
          // Successfully authenticated
          console.log('OAuth authentication successful');

          // Wait a moment for the trigger to create the user profile
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Redirect to home page
          navigate('/', { replace: true });
        } else {
          throw new Error('No session found');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Error en la autenticación');

        // Redirect to auth page after 3 seconds
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full transition-colors">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Error en Autenticación
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirigiendo a la página de inicio de sesión...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Completando Autenticación
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Por favor espera mientras procesamos tu información...
          </p>
        </div>
      </div>
    </div>
  );
}
