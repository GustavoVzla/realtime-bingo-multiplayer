/**
 * Socket.IO Client Configuration
 * Now with enhanced reconnection handling and authentication
 */

import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let socketInstance: Socket | null = null;
let reconnectionCallbacks: Array<() => void> = [];
let connectionStatusCallbacks: Array<
  (status: 'connected' | 'disconnected' | 'reconnecting') => void
> = [];

/**
 * Get current access token for Socket.IO authentication
 */
const getAccessToken = (): string | null => {
  // Get token synchronously from local storage (Supabase stores it there)
  const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0];
  const session = JSON.parse(localStorage.getItem(`sb-${projectRef}-auth-token`) || '{}');
  return session?.access_token || null;
};

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const token = getAccessToken();

    socketInstance = io(BACKEND_URL, {
      autoConnect: !!token, // Only auto-connect if token exists
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Never give up trying to reconnect
      timeout: 10000,
      auth: {
        token: token,
      },
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to server:', socketInstance?.id);
      notifyConnectionStatus('connected');

      // Update token on reconnection in case it changed
      const newToken = getAccessToken();
      if (newToken && socketInstance) {
        socketInstance.auth = { token: newToken };
      }

      // Notify all registered callbacks about reconnection
      reconnectionCallbacks.forEach((callback) => callback());
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server. Reason:', reason);
      notifyConnectionStatus('disconnected');
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
      notifyConnectionStatus('reconnecting');
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      notifyConnectionStatus('connected');

      // Notify all registered callbacks about successful reconnection
      reconnectionCallbacks.forEach((callback) => callback());
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after maximum attempts');
      notifyConnectionStatus('disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });
  }

  return socketInstance;
};

/**
 * Register a callback to be called when socket reconnects
 * Useful for re-joining rooms, re-fetching data, etc.
 */
export const onReconnect = (callback: () => void): (() => void) => {
  reconnectionCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    reconnectionCallbacks = reconnectionCallbacks.filter((cb) => cb !== callback);
  };
};

/**
 * Register a callback to be notified of connection status changes
 */
export const onConnectionStatusChange = (
  callback: (status: 'connected' | 'disconnected' | 'reconnecting') => void
): (() => void) => {
  connectionStatusCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    connectionStatusCallbacks = connectionStatusCallbacks.filter((cb) => cb !== callback);
  };
};

/**
 * Notify all connection status callbacks
 */
const notifyConnectionStatus = (status: 'connected' | 'disconnected' | 'reconnecting') => {
  connectionStatusCallbacks.forEach((callback) => callback(status));
};

/**
 * Get current connection status
 */
export const getConnectionStatus = (): 'connected' | 'disconnected' | 'reconnecting' => {
  if (!socketInstance) return 'disconnected';
  if (socketInstance.connected) return 'connected';
  if (socketInstance.active) return 'reconnecting';
  return 'disconnected';
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

// Export the socket instance directly (created on first import)
// Will only auto-connect if authentication token is available
export const socket = getSocket();
