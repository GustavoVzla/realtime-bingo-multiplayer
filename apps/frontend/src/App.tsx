/**
 * Main App Component
 * Handles routing and authentication
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ConnectionStatus } from './components/ConnectionStatus';
import { HomePage } from './pages/HomePage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { PaymentPage } from './pages/PaymentPage';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { SettingsPage } from './pages/admin/SettingsPage';
// Deprecated: RoomsPage removed in favor of SessionRoomsPage
// import { RoomsPage } from './pages/admin/RoomsPage';
import { SessionRoomsPage } from './pages/admin/SessionRoomsPage';
// Deprecated: AdminGameControlPage removed - controls integrated into SessionRoomsPage
// import { AdminGameControlPage } from './pages/admin/AdminGameControlPage';
import { WinnerVerificationPage } from './pages/WinnerVerificationPage';
import { GameTest } from './components/GameTest';
import { PlayerGameRoomPage } from './pages/PlayerGameRoomPage';
import { MyPaymentsPage } from './pages/MyPaymentsPage';

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConnectionStatus />
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/session/:id"
              element={
                <ProtectedRoute>
                  <SessionDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/game-test"
              element={
                <ProtectedRoute>
                  <GameTest />
                </ProtectedRoute>
              }
            />

            <Route
              path="/game/:sessionId"
              element={
                <ProtectedRoute>
                  <PlayerGameRoomPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-payments"
              element={
                <ProtectedRoute>
                  <MyPaymentsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Payments Route (alias for dashboard) - for E2E tests */}
            <Route
              path="/admin/payments"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/sessions"
              element={
                <ProtectedRoute requireAdmin>
                  <SessionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/sessions/:sessionId/rooms"
              element={
                <ProtectedRoute requireAdmin>
                  <SessionRoomsPage />
                </ProtectedRoute>
              }
            />

            {/* Deprecated: /admin/rooms route removed - use /admin/sessions/:sessionId/rooms instead */}
            {/* Deprecated: /admin/sessions/:sessionId/rooms/:roomId/control route removed - controls integrated into SessionRoomsPage */}

            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/winners-verification"
              element={
                <ProtectedRoute requireAdmin>
                  <WinnerVerificationPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
