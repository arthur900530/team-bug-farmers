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
      username TEXT NOT NULL,
      isMuted INTEGER NOT NULL DEFAULT 0,
      verifiedMuted INTEGER DEFAULT NULL,
      packetVerifiedMuted INTEGER DEFAULT NULL,
      packetVerifiedAt TEXT DEFAULT NULL,
      deviceId TEXT,
      deviceLabel TEXT,
      roomId TEXT,
      lastUpdated TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_roomId ON user_states(roomId);
    CREATE INDEX IF NOT EXISTS idx_lastUpdated ON user_states(lastUpdated);
    CREATE INDEX IF NOT EXISTS idx_username ON user_states(username);
  `;
  
  db.exec(schema);
  
  // Add username column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE user_states ADD COLUMN username TEXT`);
    console.log('✅ Added username column to existing database');
  } catch (error) {
    // Column already exists or table is new
  }
  
  // Add verifiedMuted column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE user_states ADD COLUMN verifiedMuted INTEGER DEFAULT NULL`);
    console.log('✅ Added verifiedMuted column to existing database');
  } catch (error) {
    // Column already exists or table is new
  }
  
  // Add packet verification columns if they don't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE user_states ADD COLUMN packetVerifiedMuted INTEGER DEFAULT NULL`);
    console.log('✅ Added packetVerifiedMuted column to existing database');
  } catch (error) {
    // Column already exists or table is new
  }
  
  try {
    db.exec(`ALTER TABLE user_states ADD COLUMN packetVerifiedAt TEXT DEFAULT NULL`);
    console.log('✅ Added packetVerifiedAt column to existing database');
  } catch (error) {
    // Column already exists or table is new
  }
  
  console.log('✅ Database initialized');
}

/**
 * Get user state by userId
 */
export function getUserState(userId) {
  const stmt = db.prepare(`
    SELECT 
      userId,
      username,
      isMuted,
      verifiedMuted,
      packetVerifiedMuted,
      packetVerifiedAt,
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
    username: row.username,
    isMuted: Boolean(row.isMuted),
    verifiedMuted: row.verifiedMuted !== null ? Boolean(row.verifiedMuted) : null,
    packetVerifiedMuted: row.packetVerifiedMuted !== null ? Boolean(row.packetVerifiedMuted) : null,
    packetVerifiedAt: row.packetVerifiedAt,
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
      username,
      isMuted,
      verifiedMuted,
      packetVerifiedMuted,
      packetVerifiedAt,
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
    username: row.username,
    isMuted: Boolean(row.isMuted),
    verifiedMuted: row.verifiedMuted !== null ? Boolean(row.verifiedMuted) : null,
    packetVerifiedMuted: row.packetVerifiedMuted !== null ? Boolean(row.packetVerifiedMuted) : null,
    packetVerifiedAt: row.packetVerifiedAt,
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
export function createOrUpdateUserState({ userId, username, isMuted, verifiedMuted, packetVerifiedMuted, packetVerifiedAt, deviceId, deviceLabel, roomId }) {
  const now = new Date().toISOString();
  
  // Convert booleans to INTEGER, handle null for verified fields
  const isMutedInt = isMuted ? 1 : 0;
  const verifiedMutedInt = verifiedMuted === null || verifiedMuted === undefined ? null : (verifiedMuted ? 1 : 0);
  const packetVerifiedMutedInt = packetVerifiedMuted === null || packetVerifiedMuted === undefined ? null : (packetVerifiedMuted ? 1 : 0);
  
  const stmt = db.prepare(`
    INSERT INTO user_states (userId, username, isMuted, verifiedMuted, packetVerifiedMuted, packetVerifiedAt, deviceId, deviceLabel, roomId, lastUpdated, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId) DO UPDATE SET
      username = excluded.username,
      isMuted = excluded.isMuted,
      verifiedMuted = CASE 
        WHEN excluded.verifiedMuted IS NOT NULL THEN excluded.verifiedMuted
        ELSE user_states.verifiedMuted
      END,
      packetVerifiedMuted = CASE 
        WHEN excluded.packetVerifiedMuted IS NOT NULL THEN excluded.packetVerifiedMuted
        ELSE user_states.packetVerifiedMuted
      END,
      packetVerifiedAt = CASE 
        WHEN excluded.packetVerifiedAt IS NOT NULL THEN excluded.packetVerifiedAt
        ELSE user_states.packetVerifiedAt
      END,
      deviceId = excluded.deviceId,
      deviceLabel = excluded.deviceLabel,
      roomId = excluded.roomId,
      lastUpdated = excluded.lastUpdated
  `);
  
  stmt.run(userId, username, isMutedInt, verifiedMutedInt, packetVerifiedMutedInt, packetVerifiedAt, deviceId, deviceLabel, roomId, now, now);
  
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
      username,
      isMuted,
      verifiedMuted,
      packetVerifiedMuted,
      packetVerifiedAt,
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
    username: row.username,
    isMuted: Boolean(row.isMuted),
    verifiedMuted: row.verifiedMuted !== null ? Boolean(row.verifiedMuted) : null,
    packetVerifiedMuted: row.packetVerifiedMuted !== null ? Boolean(row.packetVerifiedMuted) : null,
    packetVerifiedAt: row.packetVerifiedAt,
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

