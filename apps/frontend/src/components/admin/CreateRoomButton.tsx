/**
 * Create Room Button Component
 * Allows admins to create game rooms for sessions via Socket.IO
 */

import { useState } from 'react';
import { socket } from '../../lib/socket';
import { GameEvent, BingoPattern } from '@bingo/shared-types';
import { toast } from 'react-hot-toast';

interface CreateRoomButtonProps {
  sessionId: string;
  hasActiveRoom: boolean;
  pattern: BingoPattern;
  onRoomCreated?: () => void;
  disabled?: boolean;
}

export function CreateRoomButton({
  sessionId,
  hasActiveRoom,
  pattern,
  onRoomCreated,
  disabled = false,
}: CreateRoomButtonProps) {
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event

    setCreating(true);

    try {
      // Ensure socket is connected
      if (!socket.connected) {
        socket.connect();
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for connection
      }

      // Listen for room creation confirmation (one-time listener)
      socket.once(GameEvent.ROOM_CREATED, (room: any) => {
        console.log('✅ Room created:', room);
        toast.success(`Sala creada exitosamente: ${room.id.substring(0, 8)}...`);
        setCreating(false);
        onRoomCreated?.();
      });

      // Listen for errors (one-time listener)
      socket.once('error', (error: any) => {
        console.error('❌ Error creating room:', error);
        toast.error(`Error al crear sala: ${error.message || 'Error desconocido'}`);
        setCreating(false);
      });

      // Emit CREATE_ROOM event
      socket.emit(GameEvent.CREATE_ROOM, {
        sessionId,
        maxPlayers: 100, // Default max players
        pattern,
      });

      console.log('📤 CREATE_ROOM event emitted for session:', sessionId);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (creating) {
          toast.error('Tiempo de espera agotado al crear sala');
          setCreating(false);
        }
      }, 10000);
    } catch (error) {
      console.error('Error in handleCreateRoom:', error);
      toast.error('Error al crear sala');
      setCreating(false);
    }
  };

  // Show badge if room already exists
  if (hasActiveRoom) {
    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
        title="Sala activa"
      >
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Sala Activa
      </span>
    );
  }

  // Show create button if no active room
  return (
    <button
      onClick={handleCreateRoom}
      disabled={creating || disabled}
      className={`
        inline-flex items-center px-4 py-2 rounded-lg font-medium text-sm transition-all
        ${
          creating || disabled
            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 shadow-md hover:shadow-lg'
        }
      `}
      title={disabled ? 'Deshabilitado' : 'Crear sala de juego'}
    >
      {creating ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Creando...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Sala
        </>
      )}
    </button>
  );
}
