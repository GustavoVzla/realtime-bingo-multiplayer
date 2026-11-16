import React from 'react';
import { Room, BingoPattern } from '@bingo/shared-types';

interface RoomStatusDisplayProps {
  room: Room | null;
}

const getPatternName = (pattern: BingoPattern): string => {
  const patternNames: Record<BingoPattern, string> = {
    [BingoPattern.HORIZONTAL]: 'Línea Horizontal',
    [BingoPattern.VERTICAL]: 'Línea Vertical',
    [BingoPattern.DIAGONAL]: 'Diagonal',
    [BingoPattern.FOUR_CORNERS]: 'Cuatro Esquinas',
    [BingoPattern.FULL_CARD]: 'Cartón Lleno',
    [BingoPattern.X_SHAPE]: 'Forma de X',
    [BingoPattern.L_SHAPE]: 'Forma de L',
    [BingoPattern.M_SHAPE]: 'Forma de M',
    [BingoPattern.O_SHAPE]: 'Forma de O',
  };
  return patternNames[pattern] || pattern;
};

const getStatusBadgeClass = (status: Room['status']): string => {
  const statusClasses: Record<Room['status'], string> = {
    waiting: 'bg-blue-100 text-blue-800',
    playing: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    ended: 'bg-gray-100 text-gray-800',
  };
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

const getStatusText = (status: Room['status']): string => {
  const statusTexts: Record<Room['status'], string> = {
    waiting: 'Esperando',
    playing: 'En Juego',
    paused: 'Pausado',
    ended: 'Finalizado',
  };
  return statusTexts[status] || status;
};

const renderPatternGrid = (pattern: BingoPattern): React.ReactElement => {
  const createGrid = (markedCells: boolean[][]): React.ReactElement => {
    return (
      <div className="grid grid-cols-5 gap-1 w-32 h-32 mx-auto mt-2">
        {markedCells.flat().map((isMarked, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-center rounded ${
              isMarked ? 'bg-blue-600 text-white font-bold' : 'bg-gray-200 text-gray-400'
            } text-xs`}
          >
            {isMarked ? '●' : '○'}
          </div>
        ))}
      </div>
    );
  };

  const emptyGrid = (): boolean[][] =>
    Array(5)
      .fill(null)
      .map(() => Array(5).fill(false));

  let grid = emptyGrid();
  grid[2][2] = true; // FREE space always marked

  switch (pattern) {
    case BingoPattern.HORIZONTAL:
      grid[0] = Array(5).fill(true);
      break;
    case BingoPattern.VERTICAL:
      grid.forEach((row) => (row[0] = true));
      break;
    case BingoPattern.DIAGONAL:
      grid.forEach((row, i) => (row[i] = true));
      break;
    case BingoPattern.FOUR_CORNERS:
      grid[0][0] = grid[0][4] = grid[4][0] = grid[4][4] = true;
      break;
    case BingoPattern.FULL_CARD:
      grid = Array(5)
        .fill(null)
        .map(() => Array(5).fill(true));
      break;
    case BingoPattern.X_SHAPE:
      grid.forEach((row, i) => {
        row[i] = true;
        row[4 - i] = true;
      });
      break;
    case BingoPattern.L_SHAPE:
      grid[0][0] = grid[1][0] = grid[2][0] = grid[3][0] = true;
      grid[4][0] = grid[4][1] = grid[4][2] = grid[4][3] = grid[4][4] = true;
      break;
    case BingoPattern.M_SHAPE:
      // M pattern: two vertical lines on edges and center peak
      grid.forEach((row, i) => {
        row[0] = true;
        row[4] = true;
        if (i <= 2) row[2] = true;
      });
      break;
    case BingoPattern.O_SHAPE:
      // O pattern: perimeter only
      grid[0] = Array(5).fill(true);
      grid[4] = Array(5).fill(true);
      grid[1][0] = grid[1][4] = true;
      grid[2][0] = grid[2][4] = true;
      grid[3][0] = grid[3][4] = true;
      break;
  }

  return createGrid(grid);
};

export default function RoomStatusDisplay({ room }: RoomStatusDisplayProps) {
  if (!room) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 text-lg">No hay sala activa</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estado de la Sala</h2>
          <p className="text-sm text-gray-500 mt-1">
            ID: {room.id.substring(0, 8)}... | Sesión: {room.sessionId.substring(0, 8)}...
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeClass(
            room.status
          )}`}
        >
          {getStatusText(room.status)}
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Players */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">👥</div>
          <p className="text-gray-600 text-sm">Jugadores</p>
          <p className="text-gray-900 text-lg font-semibold">
            {room.players.length} / {room.maxPlayers}
          </p>
        </div>

        {/* Prize Amount */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">💰</div>
          <p className="text-gray-600 text-sm">Premio</p>
          <p className="text-gray-900 text-lg font-semibold">
            {room.prizeAmount ? `$${room.prizeAmount.toFixed(2)}` : 'N/A'}
          </p>
        </div>

        {/* Drawn Balls */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🎱</div>
          <p className="text-gray-600 text-sm">Bolas Sorteadas</p>
          <p className="text-gray-900 text-lg font-semibold">{room.drawnBalls.length} / 75</p>
        </div>

        {/* Current Ball */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🔢</div>
          <p className="text-gray-600 text-sm">Bola Actual</p>
          <p className="text-gray-900 text-lg font-semibold">{room.currentBall || '-'}</p>
        </div>
      </div>

      {/* Pattern Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Patrón Ganador: {getPatternName(room.pattern)}
        </h3>
        {renderPatternGrid(room.pattern)}
      </div>

      {/* Winners Section */}
      {room.winners && room.winners.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ganadores</h3>
          <div className="bg-green-50 rounded-lg p-4">
            <ul className="space-y-2">
              {room.winners.map((winner, idx) => (
                <li key={idx} className="flex items-center text-green-800">
                  <span className="text-lg mr-2">🏆</span>
                  <span className="font-medium">{winner}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
