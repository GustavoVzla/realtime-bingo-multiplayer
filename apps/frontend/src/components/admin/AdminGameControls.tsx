/**
 * AdminGameControls Component
 * Provides admin controls for game management including manual and auto-draw functionality
 */

import { useState, useEffect } from 'react';
import { socket } from '../../lib/socket';
import { GameEvent } from '@bingo/shared-types';
import { Play, Pause, Clock, Zap, AlertCircle, Hand, Activity } from 'lucide-react';

interface AdminGameControlsProps {
  roomId: string;
  gameStatus: 'waiting' | 'playing' | 'active' | 'paused' | 'ended';
}

/**
 * Get the BINGO letter for a given ball number
 * B = 1-15, I = 16-30, N = 31-45, G = 46-60, O = 61-75
 */
function getBingoLetter(ballNumber: number): string {
  if (ballNumber >= 1 && ballNumber <= 15) return 'B';
  if (ballNumber >= 16 && ballNumber <= 30) return 'I';
  if (ballNumber >= 31 && ballNumber <= 45) return 'N';
  if (ballNumber >= 46 && ballNumber <= 60) return 'G';
  if (ballNumber >= 61 && ballNumber <= 75) return 'O';
  return '';
}

export function AdminGameControls({ roomId, gameStatus }: AdminGameControlsProps) {
  const [autoDrawEnabled, setAutoDrawEnabled] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawingBall, setDrawingBall] = useState(false);
  const [currentBall, setCurrentBall] = useState<number | null>(null);
  const [drawnBalls, setDrawnBalls] = useState<number[]>([]);

  // Listen for auto-draw status changes and ball events
  useEffect(() => {
    const handleAutoDrawStarted = (data: {
      roomId: string;
      autoDrawEnabled: boolean;
      intervalSeconds: number;
    }) => {
      if (data.roomId === roomId) {
        setAutoDrawEnabled(true);
        setIntervalSeconds(data.intervalSeconds);
        setError(null);
        setLoading(false);
      }
    };

    const handleAutoDrawStopped = (data: { roomId: string; autoDrawEnabled: boolean }) => {
      if (data.roomId === roomId) {
        setAutoDrawEnabled(false);
        setError(null);
        setLoading(false);
      }
    };

    const handleBallCalled = (data: { roomId: string; ball: number }) => {
      if (data.roomId === roomId) {
        setCurrentBall(data.ball);
        setDrawnBalls((prev) => [...prev, data.ball]);
        setDrawingBall(false);
      }
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
      setDrawingBall(false);
    };

    socket.on(GameEvent.AUTO_DRAW_STARTED, handleAutoDrawStarted);
    socket.on(GameEvent.AUTO_DRAW_STOPPED, handleAutoDrawStopped);
    socket.on(GameEvent.BALL_CALLED, handleBallCalled);
    socket.on('error', handleError);

    return () => {
      socket.off(GameEvent.AUTO_DRAW_STARTED, handleAutoDrawStarted);
      socket.off(GameEvent.AUTO_DRAW_STOPPED, handleAutoDrawStopped);
      socket.off(GameEvent.BALL_CALLED, handleBallCalled);
      socket.off('error', handleError);
    };
  }, [roomId]);

  const handleDrawBall = () => {
    setDrawingBall(true);
    setError(null);
    socket.emit(GameEvent.DRAW_BALL, { roomId });
  };

  const handleStartAutoDraw = () => {
    setLoading(true);
    setError(null);
    socket.emit(GameEvent.START_AUTO_DRAW, {
      roomId,
      intervalSeconds,
    });
  };

  const handleStopAutoDraw = () => {
    setLoading(true);
    setError(null);
    socket.emit(GameEvent.STOP_AUTO_DRAW, { roomId });
  };

  const handleIntervalChange = (value: number) => {
    // Validate range (2-10 seconds)
    const validatedValue = Math.max(2, Math.min(10, value));
    setIntervalSeconds(validatedValue);
  };

  // Only show controls if game is playing (active in database = playing in memory)
  if (gameStatus !== 'playing' && gameStatus !== 'active') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Current Ball Display */}
      {currentBall && (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-center">
          <p className="text-white text-sm font-medium mb-2">Última Bola Sorteada</p>
          <div className="bg-white rounded-full w-28 h-28 mx-auto flex flex-col items-center justify-center shadow-xl">
            <span className="text-2xl font-bold text-blue-600 leading-none">
              {getBingoLetter(currentBall)}
            </span>
            <span className="text-5xl font-bold text-gray-900 leading-none">
              {currentBall}
            </span>
          </div>
          <p className="text-white text-sm mt-3">
            {drawnBalls.length} / 75 bolas sorteadas
          </p>
        </div>
      )}

      {/* Ball History Display */}
      {drawnBalls.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Historial de Bolas
          </h3>
          <div className="grid grid-cols-5 gap-4">
            {/* B Column */}
            <div>
              <div className="text-center font-bold text-blue-600 dark:text-blue-400 mb-2 text-lg">
                B
              </div>
              <div className="space-y-2">
                {drawnBalls
                  .filter((ball) => ball >= 1 && ball <= 15)
                  .map((ball) => (
                    <div
                      key={ball}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-lg py-2 text-center font-semibold text-sm"
                    >
                      {ball}
                    </div>
                  ))}
              </div>
            </div>

            {/* I Column */}
            <div>
              <div className="text-center font-bold text-red-600 dark:text-red-400 mb-2 text-lg">
                I
              </div>
              <div className="space-y-2">
                {drawnBalls
                  .filter((ball) => ball >= 16 && ball <= 30)
                  .map((ball) => (
                    <div
                      key={ball}
                      className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 rounded-lg py-2 text-center font-semibold text-sm"
                    >
                      {ball}
                    </div>
                  ))}
              </div>
            </div>

            {/* N Column */}
            <div>
              <div className="text-center font-bold text-purple-600 dark:text-purple-400 mb-2 text-lg">
                N
              </div>
              <div className="space-y-2">
                {drawnBalls
                  .filter((ball) => ball >= 31 && ball <= 45)
                  .map((ball) => (
                    <div
                      key={ball}
                      className="bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-lg py-2 text-center font-semibold text-sm"
                    >
                      {ball}
                    </div>
                  ))}
              </div>
            </div>

            {/* G Column */}
            <div>
              <div className="text-center font-bold text-green-600 dark:text-green-400 mb-2 text-lg">
                G
              </div>
              <div className="space-y-2">
                {drawnBalls
                  .filter((ball) => ball >= 46 && ball <= 60)
                  .map((ball) => (
                    <div
                      key={ball}
                      className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 rounded-lg py-2 text-center font-semibold text-sm"
                    >
                      {ball}
                    </div>
                  ))}
              </div>
            </div>

            {/* O Column */}
            <div>
              <div className="text-center font-bold text-orange-600 dark:text-orange-400 mb-2 text-lg">
                O
              </div>
              <div className="space-y-2">
                {drawnBalls
                  .filter((ball) => ball >= 61 && ball <= 75)
                  .map((ball) => (
                    <div
                      key={ball}
                      className="bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 rounded-lg py-2 text-center font-semibold text-sm"
                    >
                      {ball}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Draw Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Hand className="w-5 h-5 mr-2 text-blue-500" />
            Sorteo Manual
          </h3>
        </div>

        <button
          onClick={handleDrawBall}
          disabled={drawingBall || autoDrawEnabled || drawnBalls.length >= 75}
          className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
        >
          {drawingBall ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Sorteando...
            </>
          ) : (
            <>
              <Activity className="w-5 h-5 mr-2" />
              Sortear Bola Manualmente
            </>
          )}
        </button>

        {autoDrawEnabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
            El sorteo manual está deshabilitado mientras el sorteo automático está activo
          </p>
        )}
      </div>

      {/* Auto Draw Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Sorteo Automático
          </h3>
          {autoDrawEnabled && (
            <span className="flex items-center text-sm text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
              Activo
            </span>
          )}
        </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Interval Configuration */}
        {!autoDrawEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Intervalo entre bolas (segundos)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="2"
                max="10"
                step="1"
                value={intervalSeconds}
                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 w-12 text-center">
                {intervalSeconds}s
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Recomendado: 3-7 segundos para mejor experiencia de juego
            </p>
          </div>
        )}

        {/* Current Interval Display (when active) */}
        {autoDrawEnabled && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Intervalo actual:
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {intervalSeconds}s
              </span>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-3">
          {!autoDrawEnabled ? (
            <button
              onClick={handleStartAutoDraw}
              disabled={loading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar Sorteo Automático
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStopAutoDraw}
              disabled={loading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Deteniendo...
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Detener Sorteo Automático
                </>
              )}
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">Nota:</strong> El sorteo automático
            se detendrá automáticamente cuando se hayan sacado las 75 bolas o cuando un jugador
            cante BINGO.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
