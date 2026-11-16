import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { CardSelector } from '../components/CardSelector';
import { Header } from '../components/Header';
import {
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
  Trophy,
  Grid3X3,
  ArrowLeft,
  CreditCard,
} from 'lucide-react';
import type { Tables } from '@bingo/shared-types';

type BingoSession = Tables<'bingo_sessions'>;
type BingoCard = Tables<'bingo_cards'>;

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<BingoSession | null>(null);
  const [cards, setCards] = useState<BingoCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessionDetails = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('bingo_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        throw new Error('Sesión no encontrada');
      }

      setSession(sessionData);

      // Fetch available cards (not sold and no player assigned)
      const { data: cardsData, error: cardsError } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('session_id', id)
        .is('player_id', null)
        .eq('is_sold', false)
        .order('card_number', { ascending: true });

      if (cardsError) throw cardsError;

      setCards(cardsData || []);
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar los detalles de la sesión'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchSessionDetails();
    } else {
      setError('ID de sesión no válido');
      setLoading(false);
    }
  }, [id, fetchSessionDetails]);

  const handleCardSelect = (cardId: string) => {
    setSelectedCards((prev) => {
      if (prev.includes(cardId)) {
        // Deselect
        return prev.filter((id) => id !== cardId);
      } else {
        // Select
        return [...prev, cardId];
      }
    });
  };

  const handleProceedToPayment = () => {
    if (!session || selectedCards.length === 0) return;

    const totalAmount = selectedCards.length * session.card_price;

    navigate('/payment', {
      state: {
        sessionId: session.id,
        selectedCards,
        totalAmount,
      },
    });
  };

  const getPatternDisplay = (pattern: string) => {
    const patterns: Record<string, string> = {
      horizontal: 'Línea Horizontal',
      vertical: 'Línea Vertical',
      diagonal: 'Diagonal',
      L: 'Letra L',
      M: 'Letra M',
      O: 'Letra O',
      X: 'Letra X',
      four_corners: 'Cuatro Esquinas',
      full_card: 'Cartón Lleno',
    };
    return patterns[pattern] || pattern;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando detalles de la sesión...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 text-center mb-4">
              {error || 'Sesión no encontrada'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = selectedCards.length * session.card_price;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a Sesiones
        </button>

        {/* Session Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Selecciona tus Cartones
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Elige hasta {session.max_cards_per_player}{' '}
                {session.max_cards_per_player === 1 ? 'cartón' : 'cartones'} para esta sesión
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <span
                className={`
                  inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                  ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }
                `}
              >
                {session.status === 'active' ? 'En Vivo' : 'Programado'}
              </span>
            </div>
          </div>

          {/* Session Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Fecha y Hora</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {format(new Date(session.date_time), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {format(new Date(session.date_time), 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Precio por Cartón</p>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  ${session.card_price.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Trophy className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Premio</p>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">
                  ${session.prize_amount ? session.prize_amount.toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Grid3X3 className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Patrón Ganador</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {getPatternDisplay(session.winning_pattern)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Selector or No Cards Message */}
        {cards.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 transition-colors">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  No hay cartones disponibles
                </h3>
                <p className="text-yellow-800 dark:text-yellow-300 mb-3">
                  Actualmente no hay cartones disponibles para esta sesión. Esto puede deberse a:
                </p>
                <ul className="list-disc list-inside text-yellow-800 dark:text-yellow-300 space-y-1 text-sm">
                  <li>Los cartones aún no han sido generados por el administrador</li>
                  <li>Todos los cartones disponibles ya fueron reservados</li>
                  <li>La sesión está llena de jugadores</li>
                </ul>
                <p className="text-yellow-800 dark:text-yellow-300 mt-3 text-sm">
                  Por favor, vuelve más tarde o contacta al administrador.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <CardSelector
            cards={cards}
            selectedCards={selectedCards}
            onCardSelect={handleCardSelect}
            maxCards={session.max_cards_per_player}
          />
        )}

        {/* Payment Summary Bar - Sticky when cards are selected */}
        {selectedCards.length > 0 && (
          <div className="sticky bottom-0 z-10 mt-8 mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Resumen de Compra
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    {selectedCards.length} {selectedCards.length === 1 ? 'cartón' : 'cartones'} × $
                    {session.card_price.toFixed(2)} = ${totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleProceedToPayment}
                className="
                  mt-4 md:mt-0 w-full md:w-auto
                  flex items-center justify-center
                  px-6 py-3
                  bg-blue-600 dark:bg-blue-500 text-white
                  rounded-md font-medium
                  hover:bg-blue-700 dark:hover:bg-blue-600
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  transition-colors
                "
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Proceder al Pago
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
