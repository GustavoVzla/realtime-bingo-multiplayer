/**
 * Shared Enums
 * Exported separately to avoid circular dependencies
 */

export enum UserRole {
  ADMIN = 'admin',
  PLAYER = 'player',
}

export enum GameEvent {
  // Room lifecycle
  CREATE_ROOM = 'create_room',
  ROOM_CREATED = 'room_created',
  JOIN_ROOM = 'join_room',
  ROOM_JOINED = 'room_joined',
  ROOM_UPDATED = 'room_updated',
  PLAYER_READY = 'player_ready',

  // Game lifecycle
  START_GAME = 'start_game',
  GAME_STARTED = 'game_started',
  BALL_CALLED = 'ball_called',
  MARK_CELL = 'mark_cell',
  CELL_MARKED = 'cell_marked',
  CLAIM_BINGO = 'claim_bingo',
  GAME_PAUSED = 'game_paused',
  VERIFY_BINGO = 'verify_bingo',
  BINGO_VALIDATED = 'bingo_validated',
  BINGO_REJECTED = 'bingo_rejected',
  GAME_ENDED = 'game_ended',

  // Ball drawing modes
  DRAW_BALL = 'draw_ball',
  START_AUTO_DRAW = 'start_auto_draw',
  STOP_AUTO_DRAW = 'stop_auto_draw',
  AUTO_DRAW_STARTED = 'auto_draw_started',
  AUTO_DRAW_STOPPED = 'auto_draw_stopped',
  DRAW_MODE_CHANGED = 'draw_mode_changed',

  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
}

export enum PaymentMethod {
  PAGO_MOVIL = 'pago_movil',
  ZELLE = 'zelle',
  USDT_BINANCE = 'usdt_binance',
  BIZUM = 'bizum',
  EFECTIVO = 'efectivo',
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BingoPattern {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  DIAGONAL = 'diagonal',
  L_SHAPE = 'L',
  M_SHAPE = 'M',
  O_SHAPE = 'O',
  X_SHAPE = 'X',
  FOUR_CORNERS = 'four_corners',
  FULL_CARD = 'full_card',
}

export enum RoomType {
  GENERAL = 'general',
  VIP = 'vip',
  PREMIUM = 'premium',
}

export enum RoomStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FINISHED = 'finished',
  INACTIVE = 'inactive',
}
