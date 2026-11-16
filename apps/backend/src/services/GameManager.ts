/**
 * GameManager Service - Singleton for In-Memory Game State
 *
 * Manages active game rooms, ball drawing, and bingo validation
 * Now with Redis persistence and PostgreSQL game_rooms table sync
 */

import type { Room, BingoCard, BingoPattern, Player } from '@bingo/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { redisService, type RoomData } from './RedisService.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { Server } from 'socket.io';

class GameManager {
  private static instance: GameManager;
  private rooms: Map<string, Room> = new Map();
  private autoDrawIntervals: Map<string, NodeJS.Timeout> = new Map();
  private io: Server | null = null;

  /**
   * Session-level ball drawing (shared across all rooms in a session)
   * Map<sessionId, drawnBalls[]>
   */
  private sessionBalls: Map<string, number[]> = new Map();

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Set Socket.IO server instance for emitting events
   */
  setSocketIO(io: Server): void {
    this.io = io;
    console.log('✅ Socket.IO instance attached to GameManager');
  }

  /**
   * Create a new game room
   */
  createRoom(sessionId: string, maxPlayers: number, pattern: BingoPattern): Room {
    const room: Room = {
      id: uuidv4(),
      sessionId,
      players: [],
      maxPlayers,
      status: 'waiting',
      drawnBalls: [],
      pattern,
      createdAt: new Date(),
    };

    this.rooms.set(room.id, room);

    // Sync to Redis asynchronously
    this.syncRoomToRedis(room.id).catch((err) =>
      console.error('Failed to sync room to Redis:', err)
    );

    return room;
  }

  /**
   * Load a room from the database (game_rooms table) and add it to memory
   * This is used when a room exists in the database but not in memory (e.g., after server restart)
   */
  async loadRoomFromDatabase(roomId: string): Promise<Room | null> {
    try {
      // Fetch room from game_rooms table with session details
      const { data: gameRoom, error } = await supabaseAdmin
        .from('game_rooms')
        .select(
          `
          *,
          session:bingo_sessions!inner(
            winning_pattern
          )
        `
        )
        .eq('id', roomId)
        .single();

      if (error || !gameRoom) {
        console.error(`⚠️ Room ${roomId} not found in database:`, error);
        return null;
      }

      // Map database status to in-memory status
      const statusMap: Record<string, Room['status']> = {
        waiting: 'waiting',
        active: 'playing',
        paused: 'paused',
        finished: 'ended',
      };

      // Create in-memory room from database data
      const room: Room = {
        id: gameRoom.id,
        sessionId: gameRoom.session_id,
        name: gameRoom.name,
        players: [],
        maxPlayers: gameRoom.max_players,
        status: statusMap[gameRoom.status] || 'waiting',
        drawnBalls: [],
        pattern: (gameRoom.session as any).winning_pattern,
        prizeAmount: gameRoom.prize_amount || undefined,
        createdAt: new Date(gameRoom.created_at),
      };

      // Add to memory
      this.rooms.set(room.id, room);

      // Sync to Redis
      await this.syncRoomToRedis(room.id);

      console.log(`✅ Room ${roomId} loaded from database to memory`);
      return room;
    } catch (error) {
      console.error(`⚠️ Failed to load room ${roomId} from database:`, error);
      return null;
    }
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add player to room
   */
  async addPlayerToRoom(roomId: string, player: Player): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.players.length >= room.maxPlayers) return false;

    room.players.push(player);

    // Sync to Redis asynchronously
    this.syncRoomToRedis(roomId).catch((err) =>
      console.error('Failed to sync room to Redis:', err)
    );

    // Sync player count to database (triggers is_active recalculation)
    await this.syncPlayerCountToDatabase(roomId).catch((err) =>
      console.error('Failed to sync player count to database:', err)
    );

    return true;
  }

  /**
   * Start game and set prize
   */
  startGame(roomId: string, prizeAmount: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'playing';
    room.prizeAmount = prizeAmount;
    room.startedAt = new Date();

    // Sync to Redis asynchronously
    this.syncRoomToRedis(roomId).catch((err) =>
      console.error('Failed to sync room to Redis:', err)
    );

    return true;
  }

  /**
   * Draw a ball (SESSION-LEVEL - shared across all rooms in a session)
   * All rooms in the same session share the same ball drawing
   */
  drawBall(roomId: string): number | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'playing') return null;

    const sessionId = room.sessionId;

    // Get or initialize session balls array
    if (!this.sessionBalls.has(sessionId)) {
      this.sessionBalls.set(sessionId, []);
    }

    const drawnBalls = this.sessionBalls.get(sessionId)!;

    const availableBalls = Array.from({ length: 75 }, (_, i) => i + 1).filter(
      (ball) => !drawnBalls.includes(ball)
    );

    if (availableBalls.length === 0) return null;

    const randomBall = availableBalls[Math.floor(Math.random() * availableBalls.length)];

    // Add ball to SESSION-LEVEL array (shared across all rooms)
    drawnBalls.push(randomBall);

    // Update currentBall in THIS room (but drawnBalls is from session level)
    room.currentBall = randomBall;
    room.drawnBalls = drawnBalls; // Reference the shared session balls

    // Sync to Redis and extend TTL (active gameplay)
    this.syncRoomToRedis(roomId).catch((err) =>
      console.error('Failed to sync room to Redis:', err)
    );
    this.extendRoomTTL(roomId).catch((err) => console.error('Failed to extend room TTL:', err));

    return randomBall;
  }

  /**
   * Pause game (when BINGO claimed)
   */
  pauseGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'paused';
    return true;
  }

  /**
   * Resume game after verification
   */
  resumeGame(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'playing';
    return true;
  }

  /**
   * End game
   */
  endGame(roomId: string, winners: string[]): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.status = 'ended';
    room.winners = winners;
    room.endedAt = new Date();

    // Sync to Redis asynchronously
    this.syncRoomToRedis(roomId).catch((err) =>
      console.error('Failed to sync room to Redis:', err)
    );

    return true;
  }

  /**
   * Generate a bingo card (5x5 grid, B-I-N-G-O format)
   * Returns numbers in object format: {B: [], I: [], N: [], G: [], O: []}
   */
  generateBingoCard(sessionId: string): BingoCard {
    const B = this.getRandomNumbers(1, 15, 5);
    const I = this.getRandomNumbers(16, 30, 5);
    const N = this.getRandomNumbers(31, 45, 5);
    const G = this.getRandomNumbers(46, 60, 5);
    const O = this.getRandomNumbers(61, 75, 5);

    // Set center cell as FREE (0 represents FREE)
    N[2] = 0;

    const numbers = { B, I, N, G, O };

    return {
      id: uuidv4(),
      sessionId,
      numbers,
      createdAt: new Date(),
    };
  }

  /**
   * Helper: Generate random unique numbers in range
   */
  private getRandomNumbers(min: number, max: number, count: number): number[] {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers;
  }

  /**
   * Validate bingo pattern
   * Numbers are stored as {B: [], I: [], N: [], G: [], O: []}
   * where each array represents a column of 5 numbers
   */
  validateBingo(card: BingoCard, drawnBalls: number[], pattern: BingoPattern): boolean {
    const { numbers } = card;
    const drawnSet = new Set(drawnBalls);
    const cols = ['B', 'I', 'N', 'G', 'O'] as const;

    // Helper to get cell value by row and column index
    const getCellValue = (row: number, col: number): number => {
      return (numbers as any)[cols[col]][row];
    };

    // Helper to check if a cell is marked
    const isMarked = (row: number, col: number): boolean => {
      if (row === 2 && col === 2) return true; // FREE space
      return drawnSet.has(getCellValue(row, col));
    };

    switch (pattern) {
      case 'horizontal': {
        // Check each row
        for (let row = 0; row < 5; row++) {
          if ([0, 1, 2, 3, 4].every((col) => isMarked(row, col))) {
            return true;
          }
        }
        return false;
      }

      case 'vertical': {
        // Check each column
        for (let col = 0; col < 5; col++) {
          if ([0, 1, 2, 3, 4].every((row) => isMarked(row, col))) {
            return true;
          }
        }
        return false;
      }

      case 'diagonal': {
        const diag1 = [0, 1, 2, 3, 4].every((i) => isMarked(i, i));
        const diag2 = [0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i));
        return diag1 || diag2;
      }

      case 'four_corners': {
        return isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4);
      }

      case 'full_card': {
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 5; col++) {
            if (!isMarked(row, col)) return false;
          }
        }
        return true;
      }

      case 'X': {
        return (
          [0, 1, 2, 3, 4].every((i) => isMarked(i, i)) &&
          [0, 1, 2, 3, 4].every((i) => isMarked(i, 4 - i))
        );
      }

      case 'L': {
        // Left column
        const leftCol = [0, 1, 2, 3, 4].every((row) => isMarked(row, 0));
        // Bottom row
        const bottomRow = [0, 1, 2, 3, 4].every((col) => isMarked(4, col));
        return leftCol && bottomRow;
      }

      default:
        return false;
    }
  }

  /**
   * Remove room (cleanup)
   */
  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get all rooms for a specific session
   */
  getRoomsBySession(sessionId: string): Room[] {
    return Array.from(this.rooms.values()).filter((room) => room.sessionId === sessionId);
  }

  /**
   * Get session-level drawn balls (shared across all rooms in session)
   */
  getSessionBalls(sessionId: string): number[] {
    return this.sessionBalls.get(sessionId) || [];
  }

  /**
   * Clear session-level drawn balls (when session ends or resets)
   */
  clearSessionBalls(sessionId: string): void {
    this.sessionBalls.delete(sessionId);
  }

  /**
   * Initialize session balls array (for session restore from database)
   */
  initializeSessionBalls(sessionId: string, drawnBalls: number[]): void {
    this.sessionBalls.set(sessionId, drawnBalls);
  }

  /**
   * Convert Room to RoomData for Redis storage
   */
  private roomToData(room: Room): RoomData {
    return {
      id: room.id,
      sessionId: room.sessionId,
      status: room.status as 'waiting' | 'active' | 'paused' | 'finished',
      players: room.players as any, // Player[] type conversion
      maxPlayers: room.maxPlayers,
      pattern: room.pattern as any, // BingoPattern enum conversion
      prizeAmount: room.prizeAmount,
      currentBall: room.currentBall,
      drawnBalls: room.drawnBalls,
      createdAt: room.createdAt?.toISOString() || new Date().toISOString(),
      startedAt: room.startedAt?.toISOString(),
      endedAt: room.endedAt?.toISOString(),
    };
  }

  /**
   * Convert RoomData to Room for in-memory storage
   */
  private dataToRoom(data: RoomData): Room {
    return {
      id: data.id,
      sessionId: data.sessionId,
      status:
        data.status === 'active' ? 'playing' : data.status === 'finished' ? 'ended' : data.status,
      players: data.players as any, // Player[] type conversion
      maxPlayers: data.maxPlayers,
      pattern: data.pattern as any, // BingoPattern enum conversion
      prizeAmount: data.prizeAmount,
      currentBall: data.currentBall,
      drawnBalls: data.drawnBalls,
      createdAt: new Date(data.createdAt),
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
    };
  }

  /**
   * Sync room to Redis (called after state changes)
   */
  async syncRoomToRedis(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const roomData = this.roomToData(room);
    await redisService.saveRoom(roomData);
  }

  /**
   * Sync player count to database (triggers is_active recalculation)
   */
  async syncPlayerCountToDatabase(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const playerCount = room.players.length;

    try {
      const { data, error } = await supabaseAdmin.rpc('update_room_player_count', {
        p_room_id: roomId,
        p_player_count: playerCount,
      });

      if (error) {
        console.error(`⚠️ Failed to sync player count for room ${roomId}:`, error);
        return;
      }

      console.log(
        `✅ Synced player count for room ${roomId}: ${playerCount} players, active: ${data?.is_active}`
      );
    } catch (error) {
      console.error(`⚠️ Error syncing player count for room ${roomId}:`, error);
    }
  }

  /**
   * Load room from Redis to memory
   */
  async loadRoomFromRedis(roomId: string): Promise<Room | null> {
    const roomData = await redisService.getRoom(roomId);
    if (!roomData) return null;

    const room = this.dataToRoom(roomData);
    this.rooms.set(room.id, room);

    console.log(`✅ Room restored from Redis: ${roomId}`);
    return room;
  }

  /**
   * Restore all rooms from Redis (called on server startup)
   */
  async restoreRoomsFromRedis(): Promise<number> {
    try {
      const roomIds = await redisService.getAllRoomIds();
      console.log(`🔄 Restoring ${roomIds.length} rooms from Redis...`);

      let restoredCount = 0;
      for (const roomId of roomIds) {
        const room = await this.loadRoomFromRedis(roomId);
        if (room) {
          restoredCount++;
        }
      }

      console.log(`✅ Restored ${restoredCount}/${roomIds.length} rooms from Redis`);
      return restoredCount;
    } catch (error) {
      console.error('❌ Failed to restore rooms from Redis:', error);
      return 0;
    }
  }

  /**
   * Clean up room from memory, Redis, and database
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    const deleted = this.rooms.delete(roomId);
    if (deleted) {
      // Delete from Redis
      await redisService.deleteRoom(roomId);

      // Delete from database (game_rooms table)
      try {
        await supabaseAdmin.from('game_rooms').delete().eq('id', roomId);
        console.log(`🗑️ Room ${roomId} deleted from database`);
      } catch (error) {
        console.error(`⚠️ Failed to delete room ${roomId} from database:`, error);
        // Don't throw - room is already deleted from memory/Redis
      }
    }
    return deleted;
  }

  /**
   * Extend room TTL in Redis (called during active gameplay)
   */
  async extendRoomTTL(roomId: string): Promise<void> {
    await redisService.extendRoomTTL(roomId);
  }

  /**
   * Start automatic ball drawing for a room
   * @param roomId - The room ID
   * @param intervalSeconds - Interval in seconds between each ball draw (default: 5)
   * @returns true if auto-draw started successfully, false otherwise
   */
  startAutoDraw(roomId: string, intervalSeconds: number = 5): boolean {
    const room = this.rooms.get(roomId);

    // Validate room exists and is in playing state
    if (!room || room.status !== 'playing') {
      console.warn(`⚠️ Cannot start auto-draw: room ${roomId} not found or not playing`);
      return false;
    }

    // Check if auto-draw already running
    if (this.autoDrawIntervals.has(roomId)) {
      console.warn(`⚠️ Auto-draw already running for room ${roomId}`);
      return false;
    }

    // Start interval for automatic ball drawing
    const interval = setInterval(() => {
      const ball = this.drawBall(roomId);

      if (ball === null) {
        // No more balls to draw, stop auto-draw
        console.log(`🎯 All balls drawn for room ${roomId}, stopping auto-draw`);
        this.stopAutoDraw(roomId);
      } else {
        // Emit BALL_CALLED event to all clients in the room
        if (this.io) {
          this.io.to(roomId).emit('ball_called', { roomId, ball });
          console.log(`🎲 Ball ${ball} called for room ${roomId} (auto-draw)`);
        } else {
          console.warn(`⚠️ Socket.IO not initialized, cannot emit ball event`);
        }
      }
    }, intervalSeconds * 1000);

    this.autoDrawIntervals.set(roomId, interval);
    console.log(`✅ Auto-draw started for room ${roomId} (interval: ${intervalSeconds}s)`);

    return true;
  }

  /**
   * Stop automatic ball drawing for a room
   * @param roomId - The room ID
   * @returns true if auto-draw stopped successfully, false if not running
   */
  stopAutoDraw(roomId: string): boolean {
    const interval = this.autoDrawIntervals.get(roomId);

    if (!interval) {
      console.warn(`⚠️ Auto-draw not running for room ${roomId}`);
      return false;
    }

    clearInterval(interval);
    this.autoDrawIntervals.delete(roomId);
    console.log(`🛑 Auto-draw stopped for room ${roomId}`);

    return true;
  }
}

export const gameManager = GameManager.getInstance();
