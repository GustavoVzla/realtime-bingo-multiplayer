import type { Tables } from '@bingo/shared-types';

type BingoCard = Tables<'bingo_cards'>;

interface BingoNumbers {
  B: number[];
  I: number[];
  N: (number | string)[];
  G: number[];
  O: number[];
}

interface BingoCardGridProps {
  card: BingoCard;
  isSelected: boolean;
  onClick: () => void;
}

export function BingoCardGrid({ card, isSelected, onClick }: BingoCardGridProps) {
  // Safely parse JSONB data from Supabase
  // The 'numbers' field can be in two formats:
  // 1. Object format: {"B":[...], "I":[...], "N":[...], "G":[...], "O":[...]}
  // 2. Array format: [[B values], [I values], [N values], [G values], [O values]]
  let numbers: BingoNumbers;

  try {
    // If numbers is a string (shouldn't happen but being defensive)
    const rawNumbers = typeof card.numbers === 'string' ? JSON.parse(card.numbers) : card.numbers;

    // Validate structure exists
    if (!rawNumbers || typeof rawNumbers !== 'object') {
      throw new Error('Invalid numbers structure');
    }

    // Check if it's array format and convert to object format
    if (Array.isArray(rawNumbers)) {
      // Array format: [[B], [I], [N], [G], [O]]
      if (
        rawNumbers.length !== 5 ||
        !rawNumbers.every((col) => Array.isArray(col) && col.length === 5)
      ) {
        throw new Error('Invalid array format');
      }

      numbers = {
        B: rawNumbers[0] as number[],
        I: rawNumbers[1] as number[],
        N: rawNumbers[2] as (number | string)[],
        G: rawNumbers[3] as number[],
        O: rawNumbers[4] as number[],
      };
    } else {
      // Object format: already in correct structure
      numbers = rawNumbers as BingoNumbers;
    }
  } catch {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
        <p className="text-red-600 font-semibold">Error: Card data is invalid</p>
        <p className="text-sm text-red-500 mt-1">Card ID: {card.id}</p>
      </div>
    );
  }

  const renderCell = (letter: keyof BingoNumbers, index: number) => {
    // Safely access column with proper type checking
    const rawColumn = numbers[letter];

    // Validate column is an array of numbers
    if (!rawColumn || !Array.isArray(rawColumn)) {
      console.error(`Invalid card structure: column ${letter} is missing or not an array`, {
        cardId: card.id,
        column: rawColumn,
        columnType: typeof rawColumn,
        isArray: Array.isArray(rawColumn),
      });
      return (
        <div className="flex items-center justify-center border border-red-300 bg-red-50 h-10 sm:h-12">
          <span className="text-red-600 text-xs">ERR</span>
        </div>
      );
    }

    const column = rawColumn as (number | string)[];
    const value = column[index];
    const isFree = letter === 'N' && index === 2;

    return (
      <div
        key={`${letter}-${index}`}
        className={`
          flex items-center justify-center
          border border-gray-300
          ${isFree ? 'bg-yellow-100 font-bold text-yellow-800' : 'bg-white'}
          text-sm sm:text-base
          h-10 sm:h-12
        `}
      >
        {isFree ? 'FREE' : value}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer transition-all duration-200
        rounded-lg p-3 sm:p-4
        ${
          isSelected
            ? 'bg-blue-50 border-2 border-blue-500 shadow-lg scale-105'
            : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
        }
      `}
    >
      {/* Card Number Badge */}
      <div
        className={`
          absolute -top-2 -right-2
          px-2 py-1 rounded-full text-xs font-bold
          ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}
        `}
      >
        #{card.card_number}
      </div>

      {/* B-I-N-G-O Header */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {(['B', 'I', 'N', 'G', 'O'] as const).map((letter) => (
          <div
            key={letter}
            className="flex items-center justify-center font-bold text-lg text-blue-600"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* 5x5 Grid */}
      <div className="grid grid-cols-5 gap-1">
        {[0, 1, 2, 3, 4].map((rowIndex) => (
          <div key={rowIndex} className="contents">
            {(['B', 'I', 'N', 'G', 'O'] as const).map((letter) => renderCell(letter, rowIndex))}
          </div>
        ))}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
            Seleccionado
          </span>
        </div>
      )}
    </div>
  );
}
