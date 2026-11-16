import { redisService } from '../services/RedisService.js';
import { gameManager } from '../services/GameManager.js';

const roomId = 'b10ec7a3-ca4a-4017-8f93-3dbba627d917';

console.log('🧹 Clearing corrupted room from memory and Redis:', roomId);

// Remove from memory
const removedFromMemory = gameManager.removeRoom(roomId);
console.log(removedFromMemory ? '✅ Removed from memory' : '⚠️ Not found in memory');

// Remove from Redis
await redisService.deleteRoom(roomId);
console.log('✅ Removed from Redis');

console.log('🎉 Cleanup complete!');
process.exit(0);
