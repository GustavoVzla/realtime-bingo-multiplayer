/**
 * BingoCard Component
 * Displays a 5x5 bingo card with B-I-N-G-O headers
 */

import { useState } from 'react';
import type { BingoCard as BingoCardType } from '@bingo/shared-types';

interface BingoCardProps {
  card: BingoCardType;
  drawnBalls: number[];
  onCellClick?: (row: number, col: number) => void;
  canMark?: boolean;
}

export function BingoCard({ card, drawnBalls, onCellClick, canMark = true }: BingoCardProps) {
  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());

  const headers = ['B', 'I', 'N', 'G', 'O'] as const;

  // Helper to get cell value from both array and object formats
  const getCellValue = (row: number, col: number): number => {
    // Check if card.numbers is in array format or object format
    if (Array.isArray(card.numbers)) {
      // Array format: [[B], [I], [N], [G], [O]]
      const column = card.numbers[col];
      if (!column || !Array.isArray(column)) {
        console.error(`Invalid array format: column ${col} is`, column);
        return 0;
      }
      return column[row] ?? 0;
    } else {
      // Object format: {"B": [...], "I": [...], etc}
      const columnKey = headers[col];
      const column = (card.numbers as any)?.[columnKey];

      // Defensive check for undefined/null
      if (!column || !Array.isArray(column)) {
        console.error(`Invalid card structure: column ${columnKey} is`, column);
        return 0; // Fallback value
      }

      return column[row] ?? 0;
    }
  };

  const isCellMarked = (row: number, col: number): boolean => {
    // Center cell (FREE) is always marked
    if (row === 2 && col === 2) return true;

    const cellKey = `${row}-${col}`;
    if (markedCells.has(cellKey)) return true;

    // Auto-mark if ball was drawn
    const number = getCellValue(row, col);
    return drawnBalls.includes(number);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!canMark) return;
    if (row === 2 && col === 2) return; // Can't unmark FREE

    const number = getCellValue(row, col);
    if (!drawnBalls.includes(number)) return; // Can only mark drawn balls

    const cellKey = `${row}-${col}`;
    setMarkedCells((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cellKey)) {
        newSet.delete(cellKey);
      } else {
        newSet.add(cellKey);
      }
      return newSet;
    });

    onCellClick?.(row, col);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-w-md mx-auto">
      <div className="grid grid-cols-5 gap-1 mb-2">
        {headers.map((letter, idx) => (
          <div
            key={idx}
            className="bg-blue-600 text-white font-bold text-xl text-center py-2 rounded"
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }).map((_, rowIdx) =>
          Array.from({ length: 5 }).map((_, colIdx) => {
            const number = getCellValue(rowIdx, colIdx);
            const isMarked = isCellMarked(rowIdx, colIdx);
            const isFree = rowIdx === 2 && colIdx === 2;
            const isDrawn = drawnBalls.includes(number);

            return (
              <button
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                disabled={!canMark || isFree}
                className={`
                  aspect-square flex items-center justify-center
                  text-lg font-semibold rounded border-2 transition-all
                  ${isFree ? 'bg-yellow-400 border-yellow-600 text-yellow-900' : ''}
                  ${isMarked && !isFree ? 'bg-green-500 border-green-700 text-white' : ''}
                  ${!isMarked && !isFree && isDrawn ? 'bg-blue-100 border-blue-400' : ''}
                  ${!isMarked && !isFree && !isDrawn ? 'bg-gray-50 border-gray-300' : ''}
                  ${canMark && !isFree ? 'hover:scale-105 cursor-pointer' : ''}
                  ${!canMark ? 'cursor-not-allowed' : ''}
                `}
              >
                {isFree ? 'FREE' : number}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center">
        Card ID: {card.id.slice(0, 8)}...
      </div>
    </div>
  );
}
