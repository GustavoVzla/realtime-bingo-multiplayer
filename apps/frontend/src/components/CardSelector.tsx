import { BingoCardGrid } from './BingoCardGrid';
import type { Tables } from '@bingo/shared-types';

type BingoCard = Tables<'bingo_cards'>;

interface CardSelectorProps {
  cards: BingoCard[];
  selectedCards: string[];
  onCardSelect: (cardId: string) => void;
  maxCards: number;
}

export function CardSelector({ cards, selectedCards, onCardSelect, maxCards }: CardSelectorProps) {
  const isMaxReached = selectedCards.length >= maxCards;

  const handleCardClick = (cardId: string) => {
    const isSelected = selectedCards.includes(cardId);

    // Allow deselection always
    if (isSelected) {
      onCardSelect(cardId);
      return;
    }

    // Only allow selection if not at max
    if (!isMaxReached) {
      onCardSelect(cardId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection Counter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Cartones Seleccionados
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Selecciona hasta {maxCards} {maxCards === 1 ? 'cartón' : 'cartones'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {selectedCards.length}
              <span className="text-lg text-gray-500 dark:text-gray-400"> / {maxCards}</span>
            </div>
            <span
              className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                ${isMaxReached ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'}
              `}
            >
              {isMaxReached ? 'Máximo Alcanzado' : 'Disponible'}
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No hay cartones disponibles para esta sesión
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cards.map((card) => (
            <BingoCardGrid
              key={card.id}
              card={card}
              isSelected={selectedCards.includes(card.id)}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>
      )}

      {/* Helper Text */}
      {cards.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 transition-colors">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            <span className="font-semibold">Consejo:</span> Haz clic en los cartones para
            seleccionarlos o deseleccionarlos. Puedes elegir hasta {maxCards}{' '}
            {maxCards === 1 ? 'cartón' : 'cartones'} por sesión.
          </p>
        </div>
      )}
    </div>
  );
}
