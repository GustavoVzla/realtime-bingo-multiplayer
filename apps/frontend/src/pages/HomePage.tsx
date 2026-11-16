import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SessionCard as PlayerSessionCard } from '../components/PlayerSessionCard';
import { Header } from '../components/Header';
import { Modal } from '../components/Modal';
import { Loader2, AlertCircle, Calendar, Clock, ShoppingCart } from 'lucide-react';
import type { Tables } from '@bingo/shared-types';

type BingoSession = Tables<'bingo_sessions'>;
type TabType = 'upcoming' | 'past';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<BingoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [showNoCardsModal, setShowNoCardsModal] = useState(false);
  const [selectedSessionForJoin, setSelectedSessionForJoin] = useState<BingoSession | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ALL sessions (we'll sort by date intelligently on frontend)
      const { data, error: fetchError } = await supabase.from('bingo_sessions').select('*');

      if (fetchError) {
        throw fetchError;
      }

      // Apply intelligent sorting:
      // - Future/active sessions: ascending (closest first) - SHOWN FIRST
      // - Past sessions: descending (most recent first) - SHOWN AFTER
      const sortedSessions = (data || []).sort((a, b) => {
        const aDate = new Date(a.date_time).getTime();
        const bDate = new Date(b.date_time).getTime();
        const now = Date.now();

        const aIsPast = aDate < now || a.status === 'completed' || a.status === 'cancelled';
        const bIsPast = bDate < now || b.status === 'completed' || b.status === 'cancelled';

        // PRIORITY: Future sessions always come before past sessions
        if (aIsPast && !bIsPast) {
          return 1; // a is past, b is future -> b comes first
        } else if (!aIsPast && bIsPast) {
          return -1; // a is future, b is past -> a comes first
        }

        // If both are past or both are future, sort accordingly
        if (aIsPast && bIsPast) {
          // Past sessions: descending (most recent first)
          return bDate - aDate;
        } else {
          // Future sessions: ascending (closest first)
          return aDate - bDate;
        }
      });

      setSessions(sortedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('No se pudieron cargar las sesiones de bingo. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleJoinGame = async (sessionId: string) => {
    if (!user) {
      // Should not happen as page is protected, but just in case
      navigate('/auth');
      return;
    }

    // Check if user has purchased cards for this session
    try {
      const { data: purchasedCards, error: cardsError } = await supabase
        .from('bingo_cards')
        .select('id')
        .eq('session_id', sessionId)
        .eq('player_id', user.id)
        .eq('is_sold', true);

      if (cardsError) {
        console.error('Error checking purchased cards:', cardsError);
        // Continue anyway to let backend handle it
        navigate(`/game/${sessionId}`);
        return;
      }

      if (!purchasedCards || purchasedCards.length === 0) {
        // User hasn't purchased cards - show modal
        const session = sessions.find((s) => s.id === sessionId);
        setSelectedSessionForJoin(session || null);
        setShowNoCardsModal(true);
      } else {
        // User has cards - navigate to game
        navigate(`/game/${sessionId}`);
      }
    } catch (err) {
      console.error('Error validating card purchase:', err);
      // Continue anyway to let backend handle it
      navigate(`/game/${sessionId}`);
    }
  };

  const handleBuyCardsFromModal = () => {
    if (selectedSessionForJoin) {
      setShowNoCardsModal(false);
      navigate(`/session/${selectedSessionForJoin.id}`);
    }
  };

  // Separate sessions by date (future vs. past)
  const now = new Date();

  // Helper function to determine if session is truly active
  const isSessionActive = (session: BingoSession): boolean => {
    const sessionDate = new Date(session.date_time);
    const hoursSinceScheduled = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);

    // Session is active if:
    // 1. Status is 'active' AND
    // 2. Either the scheduled time hasn't passed OR it's been less than 3 hours since scheduled time
    //    (reasonable game duration window)
    return session.status === 'active' &&
           (sessionDate >= now || hoursSinceScheduled < 3);
  };

  const upcomingSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date_time);
    // Show as upcoming if:
    // - Future date OR
    // - Truly active (not a stale active status)
    return sessionDate >= now || isSessionActive(s);
  });

  const pastSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.date_time);
    // Past if date has passed AND not truly active
    return sessionDate < now && !isSessionActive(s);
  });

  // Further categorize upcoming sessions
  const activeSessions = upcomingSessions.filter((s) => isSessionActive(s));
  const scheduledSessions = upcomingSessions.filter(
    (s) => s.status === 'created' || s.status === 'scheduled'
  );

  // Sessions to display based on active tab
  const displaySessions = activeTab === 'upcoming' ? upcomingSessions : pastSessions;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sesiones de Bingo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Únete a las sesiones disponibles y comienza a jugar
          </p>
        </div>

        {/* Tabs for Upcoming/Past Sessions */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === 'upcoming'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                <span>Próximas Sesiones</span>
                {upcomingSessions.length > 0 && (
                  <span
                    className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      activeTab === 'upcoming'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {upcomingSessions.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('past')}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === 'past'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <div className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                <span>Sesiones Pasadas</span>
                {pastSessions.length > 0 && (
                  <span
                    className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      activeTab === 'past'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {pastSessions.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Active Sessions Alert - Only show on upcoming tab */}
        {activeTab === 'upcoming' && activeSessions.length > 0 && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-400">
                  {activeSessions.length}{' '}
                  {activeSessions.length === 1 ? 'Sesión Activa' : 'Sesiones Activas'}
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  ¡Únete ahora antes de que comience el juego!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Cargando sesiones...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-gray-700 dark:text-gray-300 text-center mb-4">{error}</p>
            <button
              onClick={fetchSessions}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            {activeTab === 'upcoming' ? (
              <>
                <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay sesiones próximas
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  No hay sesiones de bingo programadas en este momento. Por favor, vuelve más tarde
                  para ver las próximas sesiones.
                </p>
              </>
            ) : (
              <>
                <Clock className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay sesiones pasadas
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Las sesiones completadas o caducadas aparecerán aquí.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Tab Content */}
            {activeTab === 'upcoming' && (
              <>
                {/* Active Sessions */}
                {activeSessions.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                      Sesiones En Vivo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeSessions.map((session) => (
                        <PlayerSessionCard
                          key={session.id}
                          session={session}
                          onJoin={handleJoinSession}
                          onJoinGame={handleJoinGame}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Scheduled Sessions */}
                {scheduledSessions.length > 0 && (
                  <section>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Próximas Sesiones
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scheduledSessions.map((session) => (
                        <PlayerSessionCard
                          key={session.id}
                          session={session}
                          onJoin={handleJoinSession}
                          onJoinGame={handleJoinGame}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Past Tab Content */}
            {activeTab === 'past' && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Sesiones Finalizadas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastSessions.map((session) => (
                    <PlayerSessionCard
                      key={session.id}
                      session={session}
                      onJoin={handleJoinSession}
                      onJoinGame={handleJoinGame}
                      isPast={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Stats Summary */}
        {!loading && !error && sessions.length > 0 && (
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Sesiones Activas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                  {activeSessions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Próximas Sesiones</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
                  {upcomingSessions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Disponible</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessions.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* No Cards Modal */}
      <Modal
        isOpen={showNoCardsModal}
        onClose={() => setShowNoCardsModal(false)}
        title="Compra de Cartones Requerida"
        actions={
          <>
            <button
              onClick={() => setShowNoCardsModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleBuyCardsFromModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Comprar Cartones
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-700 mb-3">
                Para unirte a esta sesión de bingo, primero debes comprar cartones.
              </p>
              <p className="text-sm text-gray-600">
                Haz clic en "Comprar Cartones" para seleccionar tus cartones y proceder con el pago.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
