import { Player } from '@bingo/shared-types';

interface PlayerListProps {
  players: Player[];
}

export default function PlayerList({ players }: PlayerListProps) {
  const getInitials = (nickname: string): string => {
    return nickname
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Jugadores</h3>
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {players.length}
        </span>
      </div>

      {/* Player List */}
      {players.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No hay jugadores conectados</div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {getInitials(player.nickname)}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 font-medium truncate">{player.nickname}</p>
                <p className="text-gray-600 text-sm">
                  {player.cards.length} {player.cards.length === 1 ? 'cartón' : 'cartones'}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex-shrink-0">
                <div
                  className={`w-3 h-3 rounded-full ${
                    player.isReady ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  title={player.isReady ? 'Conectado' : 'Desconectado'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
