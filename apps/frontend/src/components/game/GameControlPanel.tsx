import { useState } from 'react';

interface GameControlPanelProps {
  roomStatus: 'waiting' | 'playing' | 'paused' | 'ended' | null;
  onCreateRoom: () => void;
  onStartGame: (prizeAmount: number) => void;
  onDrawBall: () => void;
  onPauseGame: () => void;
  onEndGame: () => void;
}

export default function GameControlPanel({
  roomStatus,
  onCreateRoom,
  onStartGame,
  onDrawBall,
  onPauseGame,
  onEndGame,
}: GameControlPanelProps) {
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeAmount, setPrizeAmount] = useState<number>(100);

  const handleStartGameClick = () => {
    setShowPrizeModal(true);
  };

  const handleConfirmPrize = () => {
    if (prizeAmount >= 1 && prizeAmount <= 10000) {
      onStartGame(prizeAmount);
      setShowPrizeModal(false);
      setPrizeAmount(100);
    }
  };

  const handleCancelPrize = () => {
    setShowPrizeModal(false);
    setPrizeAmount(100);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4">
        {roomStatus === null && (
          <button
            onClick={onCreateRoom}
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>🎮</span>
            <span>Crear Sala</span>
          </button>
        )}

        {roomStatus === 'waiting' && (
          <button
            onClick={handleStartGameClick}
            className="bg-green-600 hover:bg-green-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>▶️</span>
            <span>Iniciar Juego</span>
          </button>
        )}

        {roomStatus === 'playing' && (
          <>
            <button
              onClick={onDrawBall}
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>🎱</span>
              <span>Sortear Bola</span>
            </button>

            <button
              onClick={onPauseGame}
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>⏸️</span>
              <span>Pausar Juego</span>
            </button>
          </>
        )}

        {(roomStatus === 'playing' || roomStatus === 'paused') && (
          <button
            onClick={onEndGame}
            className="bg-red-600 hover:bg-red-700 text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>⏹️</span>
            <span>Finalizar Juego</span>
          </button>
        )}
      </div>

      {showPrizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Monto del Premio</h2>
            <p className="text-gray-600 mb-4">
              Ingrese el monto del premio para este juego (entre $1 y $10,000)
            </p>
            <input
              type="number"
              min="1"
              max="10000"
              value={prizeAmount}
              onChange={(e) => setPrizeAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-6 text-lg"
              placeholder="Ingrese el monto"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCancelPrize}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPrize}
                disabled={prizeAmount < 1 || prizeAmount > 10000}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
