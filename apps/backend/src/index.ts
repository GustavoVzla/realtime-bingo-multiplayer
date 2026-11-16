/**
 * Bingo Online Multijugador - Backend Server
 *
 * Main entry point for Express + Socket.IO server
 */

// CRITICAL: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket/index.js';
import { router as authRoutes } from './routes/auth.js';
import { router as sessionsRoutes } from './routes/sessions.js';
import { router as paymentsRoutes } from './routes/payments.js';
import { router as webhooksRoutes } from './routes/webhooks.js';
import roomsRoutes from './routes/rooms.js';
import { router as adminSessionsRoutes } from './routes/admin/sessions.js';
import { router as adminWinnersRoutes } from './routes/admin/winners.js';
import { router as adminUsersRoutes } from './routes/admin/users.js';
import { router as adminSettingsRoutes } from './routes/admin/settings.js';
import { router as adminRoomsRoutes } from './routes/admin/rooms.js';
import { errorHandler } from './middleware/errorHandler.js';
import { gameManager } from './services/GameManager.js';
import { redisService } from './services/RedisService.js';
import { supabaseAdmin } from './lib/supabase.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration: In development, allow any localhost port (5173, 5174, etc.)
const getCorsOrigin = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN;
  }

  // In development, allow any localhost port
  if (process.env.NODE_ENV !== 'production') {
    return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    };
  }

  return 'http://localhost:5173';
};

const corsOrigin = getCorsOrigin();

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.warn('⚠️ Socket connection without token:', socket.id);
      return next(new Error('Authentication required'));
    }

    // Verify JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.warn('⚠️ Invalid token for socket:', socket.id);
      return next(new Error('Invalid authentication token'));
    }

    // Attach user data to socket
    socket.data.user = {
      id: user.id,
      email: user.email,
    };

    console.log(`✅ Socket authenticated for user: ${user.email} (${socket.id})`);
    next();
  } catch (error) {
    console.error('❌ Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

// Middleware
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/admin/sessions', adminSessionsRoutes);
app.use('/api/admin/winners', adminWinnersRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/rooms', adminRoomsRoutes);

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = Number(process.env.PORT) || 3000;

// Restore rooms from Redis on startup
gameManager
  .restoreRoomsFromRedis()
  .then((count) => {
    if (count > 0) {
      console.log(`✅ Restored ${count} active rooms from Redis`);
    }
  })
  .catch((err) => {
    console.error('⚠️ Failed to restore rooms from Redis:', err);
  });

// Listen on '::' for dual-stack IPv4/IPv6 support (fixes ::1 connection issues)
httpServer.listen(PORT, '::', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Listening on dual-stack IPv4/IPv6 (::)`);
  console.log(
    `🔴 Redis: ${redisService.isReady() ? 'Connected' : 'Not connected (running without persistence)'}`
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');

  // Disconnect Redis
  await redisService.disconnect();

  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
