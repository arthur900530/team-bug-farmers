import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create database connection
const db = new Database(join(__dirname, 'audio-states.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS user_states (
      userId TEXT PRIMARY KEY,
      isMuted INTEGER NOT NULL DEFAULT 0,
      deviceId TEXT,
      deviceLabel TEXT,
      roomId TEXT,
      lastUpdated TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_roomId ON user_states(roomId);
    CREATE INDEX IF NOT EXISTS idx_lastUpdated ON user_states(lastUpdated);
  `;
  
  db.exec(schema);
  console.log('✅ Database initialized');
}

/**
 * Get user state by userId
 */
export function getUserState(userId) {
  const stmt = db.prepare(`
    SELECT 
      userId,
      isMuted,
      deviceId,
      deviceLabel,
      roomId,
      lastUpdated,
      createdAt
    FROM user_states 
    WHERE userId = ?
  `);
  
  const row = stmt.get(userId);
  
  if (!row) return null;
  
  return {
    userId: row.userId,
    isMuted: Boolean(row.isMuted),
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    roomId: row.roomId,
    lastUpdated: row.lastUpdated,
    createdAt: row.createdAt
  };
}

/**
 * Get all user states
 */
export function getAllUserStates() {
  const stmt = db.prepare(`
    SELECT 
      userId,
      isMuted,
      deviceId,
      deviceLabel,
      roomId,
      lastUpdated,
      createdAt
    FROM user_states 
    ORDER BY lastUpdated DESC
  `);
  
  const rows = stmt.all();
  
  return rows.map(row => ({
    userId: row.userId,
    isMuted: Boolean(row.isMuted),
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    roomId: row.roomId,
    lastUpdated: row.lastUpdated,
    createdAt: row.createdAt
  }));
}

/**
 * Create or update user state
 */
export function createOrUpdateUserState({ userId, isMuted, deviceId, deviceLabel, roomId }) {
  const now = new Date().toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO user_states (userId, isMuted, deviceId, deviceLabel, roomId, lastUpdated, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      isMuted = excluded.isMuted,
      deviceId = excluded.deviceId,
      deviceLabel = excluded.deviceLabel,
      roomId = excluded.roomId,
      lastUpdated = excluded.lastUpdated
  `);
  
  stmt.run(userId, isMuted ? 1 : 0, deviceId, deviceLabel, roomId, now, now);
  
  return getUserState(userId);
}

/**
 * Delete user state
 */
export function deleteUserState(userId) {
  const stmt = db.prepare('DELETE FROM user_states WHERE userId = ?');
  const result = stmt.run(userId);
  return result.changes > 0;
}

/**
 * Get users by room
 */
export function getUsersByRoom(roomId) {
  const stmt = db.prepare(`
    SELECT 
      userId,
      isMuted,
      deviceId,
      deviceLabel,
      roomId,
      lastUpdated,
      createdAt
    FROM user_states 
    WHERE roomId = ?
    ORDER BY lastUpdated DESC
  `);
  
  const rows = stmt.all(roomId);
  
  return rows.map(row => ({
    userId: row.userId,
    isMuted: Boolean(row.isMuted),
    deviceId: row.deviceId,
    deviceLabel: row.deviceLabel,
    roomId: row.roomId,
    lastUpdated: row.lastUpdated,
    createdAt: row.createdAt
  }));
}

/**
 * Clean up old entries (optional - for maintenance)
 */
export function cleanupOldEntries(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoff = cutoffDate.toISOString();
  
  const stmt = db.prepare('DELETE FROM user_states WHERE lastUpdated < ?');
  const result = stmt.run(cutoff);
  
  return result.changes;
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
});

