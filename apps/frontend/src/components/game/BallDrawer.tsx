import { useEffect, useState } from 'react';

interface BallDrawerProps {
  onDrawBall: () => void;
  lastBall: number | null;
  drawnBalls: number[];
  isGameActive: boolean;
}

const getBallColor = (ball: number): string => {
  if (ball <= 15) return 'bg-red-500';
  if (ball <= 30) return 'bg-blue-500';
  if (ball <= 45) return 'bg-green-500';
  if (ball <= 60) return 'bg-yellow-500';
  return 'bg-purple-500';
};

const getBallLetter = (ball: number): string => {
  if (ball <= 15) return 'B';
  if (ball <= 30) return 'I';
  if (ball <= 45) return 'N';
  if (ball <= 60) return 'G';
  return 'O';
};

export default function BallDrawer({
  onDrawBall,
  lastBall,
  drawnBalls,
  isGameActive,
}: BallDrawerProps) {
  const [animateLastBall, setAnimateLastBall] = useState(false);

  useEffect(() => {
    if (lastBall) {
      setAnimateLastBall(true);
      const timer = setTimeout(() => setAnimateLastBall(false), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lastBall]);

  const lastFiveBalls = drawnBalls.slice(-5).reverse();
  const progressPercentage = (drawnBalls.length / 75) * 100;

  const allBalls = Array.from({ length: 75 }, (_, i) => i + 1);
  const bingoColumns = {
    B: allBalls.filter((n) => n <= 15),
    I: allBalls.filter((n) => n > 15 && n <= 30),
    N: allBalls.filter((n) => n > 30 && n <= 45),
    G: allBalls.filter((n) => n > 45 && n <= 60),
    O: allBalls.filter((n) => n > 60 && n <= 75),
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto p-6">
      {/* Botón de sorteo */}
      <button
        onClick={onDrawBall}
        disabled={!isGameActive}
        className={`
          px-8 py-4 rounded-lg text-white font-bold text-xl
          bg-gradient-to-r from-purple-500 to-pink-500
          hover:from-purple-600 hover:to-pink-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${isGameActive ? 'animate-pulse' : ''}
        `}
      >
        🎲 SORTEAR BOLA
      </button>

      {/* Bola actual grande */}
      <div className="flex flex-col items-center gap-4">
        {lastBall ? (
          <div
            className={`
              w-32 h-32 rounded-full flex flex-col items-center justify-center
              text-white font-bold shadow-lg
              ${getBallColor(lastBall)}
              ${animateLastBall ? 'animate-bounce scale-110' : 'scale-100'}
              transition-all duration-300
            `}
          >
            <div className="text-2xl">{getBallLetter(lastBall)}</div>
            <div className="text-4xl">{lastBall}</div>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gray-200 text-gray-400 font-bold text-xl">
            ---
          </div>
        )}
      </div>

      {/* Historial últimas 5 bolas */}
      {lastFiveBalls.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Últimas:</span>
          {lastFiveBalls.map((ball, index) => (
            <div
              key={`${ball}-${index}`}
              className={`
                w-12 h-12 rounded-full flex flex-col items-center justify-center
                text-white font-semibold text-xs shadow-md
                ${getBallColor(ball)}
                transition-all duration-200
              `}
            >
              <div className="text-[0.6rem]">{getBallLetter(ball)}</div>
              <div className="text-sm">{ball}</div>
            </div>
          ))}
        </div>
      )}

      {/* Contador y progress bar */}
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {drawnBalls.length} / 75 bolas sorteadas
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Tablero completo 1-75 */}
      <div className="w-full bg-white rounded-lg shadow-lg p-4">
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(bingoColumns).map(([letter, numbers]) => (
            <div key={letter} className="flex flex-col gap-1">
              <div className="text-center font-bold text-xl text-gray-800 mb-2">{letter}</div>
              {numbers.map((ball) => {
                const isDrawn = drawnBalls.includes(ball);
                return (
                  <div
                    key={ball}
                    className={`
                      w-full aspect-square rounded-md flex items-center justify-center
                      text-sm font-semibold transition-all duration-200
                      ${
                        isDrawn
                          ? `${getBallColor(ball)} text-white opacity-100 shadow-md`
                          : 'bg-gray-200 text-gray-600 opacity-50'
                      }
                    `}
                  >
                    {ball}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
