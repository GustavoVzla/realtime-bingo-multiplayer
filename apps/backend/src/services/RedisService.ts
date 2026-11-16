/**
 * RedisService - Persistent storage for game rooms
 *
 * Provides Redis-based persistence for GameManager rooms to survive server restarts.
 * Uses TTL (Time To Live) for automatic cleanup of inactive rooms.
 */

import Redis from 'ioredis';

export interface RoomData {
  id: string;
  sessionId: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  players: Array<{ id: string; name: string; socketId: string }>;
  maxPlayers: number;
  pattern: string;
  prizeAmount?: number;
  currentBall?: number;
  drawnBalls: number[];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

class RedisService {
  private client: Redis | null = null;
  private isConnected = false;
  private readonly ROOM_PREFIX = 'bingo:room:';
  private readonly ROOM_TTL = 3600; // 1 hour TTL for inactive rooms

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis client with retry strategy
   */
  private initialize(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Parse Redis URL and configure TLS if needed
      const isTLS = redisUrl.startsWith('rediss://');

      console.log(`🔧 Connecting to Redis: ${redisUrl.substring(0, 20)}... (TLS: ${isTLS})`);

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 10) {
            console.error('❌ Redis connection failed after 10 retries');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          console.warn('⚠️ Redis reconnect on error:', err.message);
          return true;
        },
        // Enable TLS for Upstash (rediss:// URLs)
        tls: isTLS
          ? {
              rejectUnauthorized: false, // Required for Upstash
            }
          : undefined,
        // Family 4 forces IPv4 (some systems have issues with IPv6)
        family: 4,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ Redis error:', err.message);
        console.error('❌ Redis error stack:', err.stack);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.client = null;
    }
  }

  /**
   * Check if Redis is connected and ready
   */
  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Save room data to Redis with TTL
   */
  async saveRoom(room: RoomData): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('⚠️ Redis not ready, skipping saveRoom');
      return false;
    }

    try {
      const key = `${this.ROOM_PREFIX}${room.id}`;
      const value = JSON.stringify(room);

      await this.client!.setex(key, this.ROOM_TTL, value);

      console.log(`💾 Room saved to Redis: ${room.id} (TTL: ${this.ROOM_TTL}s)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save room to Redis:', error);
      return false;
    }
  }

  /**
   * Get room data from Redis
   */
  async getRoom(roomId: string): Promise<RoomData | null> {
    if (!this.isReady()) {
      console.warn('⚠️ Redis not ready, skipping getRoom');
      return null;
    }

    try {
      const key = `${this.ROOM_PREFIX}${roomId}`;
      const value = await this.client!.get(key);

      if (!value) {
        return null;
      }

      const room: RoomData = JSON.parse(value);
      console.log(`📖 Room loaded from Redis: ${roomId}`);
      return room;
    } catch (error) {
      console.error('❌ Failed to get room from Redis:', error);
      return null;
    }
  }

  /**
   * Delete room from Redis
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('⚠️ Redis not ready, skipping deleteRoom');
      return false;
    }

    try {
      const key = `${this.ROOM_PREFIX}${roomId}`;
      await this.client!.del(key);

      console.log(`🗑️ Room deleted from Redis: ${roomId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete room from Redis:', error);
      return false;
    }
  }

  /**
   * Get all room IDs from Redis
   */
  async getAllRoomIds(): Promise<string[]> {
    if (!this.isReady()) {
      console.warn('⚠️ Redis not ready, skipping getAllRoomIds');
      return [];
    }

    try {
      const pattern = `${this.ROOM_PREFIX}*`;
      const keys = await this.client!.keys(pattern);

      const roomIds = keys.map((key) => key.replace(this.ROOM_PREFIX, ''));
      console.log(`📋 Found ${roomIds.length} rooms in Redis`);
      return roomIds;
    } catch (error) {
      console.error('❌ Failed to get room IDs from Redis:', error);
      return [];
    }
  }

  /**
   * Extend TTL for active room (called during gameplay)
   */
  async extendRoomTTL(roomId: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const key = `${this.ROOM_PREFIX}${roomId}`;
      await this.client!.expire(key, this.ROOM_TTL);
      return true;
    } catch (error) {
      console.error('❌ Failed to extend room TTL:', error);
      return false;
    }
  }

  /**
   * Get room TTL (remaining time in seconds)
   */
  async getRoomTTL(roomId: string): Promise<number> {
    if (!this.isReady()) {
      return -1;
    }

    try {
      const key = `${this.ROOM_PREFIX}${roomId}`;
      const ttl = await this.client!.ttl(key);
      return ttl;
    } catch (error) {
      console.error('❌ Failed to get room TTL:', error);
      return -1;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      console.log('👋 Redis disconnected gracefully');
    }
  }
}

// Singleton instance
export const redisService = new RedisService();
