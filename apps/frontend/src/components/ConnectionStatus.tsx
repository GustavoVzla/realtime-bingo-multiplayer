/**
 * ConnectionStatus Component
 * Displays connection status to the server with auto-reconnection feedback
 */

import { useState, useEffect } from 'react';
import { onConnectionStatusChange } from '../lib/socket';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export function ConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);

      // Show banner only for disconnected/reconnecting states
      if (newStatus !== 'connected') {
        setShowBanner(true);
      } else {
        // Hide banner after 2 seconds when reconnected
        setTimeout(() => {
          setShowBanner(false);
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showBanner && status === 'connected') {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showBanner ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {status === 'reconnecting' && (
        <div className="bg-yellow-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Reconectando al servidor...</span>
        </div>
      )}

      {status === 'disconnected' && (
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Conexión perdida. Intentando reconectar...</span>
        </div>
      )}

      {status === 'connected' && showBanner && (
        <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md">
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">✅ Reconectado exitosamente</span>
        </div>
      )}
    </div>
  );
}
