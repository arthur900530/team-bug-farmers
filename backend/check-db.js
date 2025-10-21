#!/usr/bin/env node
/**
 * Simple script to check database contents
 * Usage: node check-db.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'audio-states.db'));

console.log('==========================================');
console.log('📊 Database Contents');
console.log('==========================================\n');

try {
  // Get all users
  const users = db.prepare(`
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
  `).all();

  if (users.length === 0) {
    console.log('No users in database yet.\n');
    console.log('💡 Tip: Join a meeting in the frontend to create user states.');
  } else {
    console.log(`Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.userId}`);
      console.log(`   Status: ${user.isMuted ? '🔇 Muted' : '🎤 Unmuted'}`);
      console.log(`   Device: ${user.deviceLabel || user.deviceId || 'N/A'}`);
      console.log(`   Room: ${user.roomId || 'N/A'}`);
      console.log(`   Last Updated: ${new Date(user.lastUpdated).toLocaleString()}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log('');
    });
  }

  // Get table info
  const tableInfo = db.prepare("PRAGMA table_info(user_states)").all();
  console.log('==========================================');
  console.log('📋 Table Schema');
  console.log('==========================================\n');
  tableInfo.forEach(col => {
    console.log(`  ${col.name}: ${col.type}${col.pk ? ' (PRIMARY KEY)' : ''}`);
  });
  console.log('');

} catch (error) {
  console.error('Error reading database:', error.message);
} finally {
  db.close();
}

console.log('==========================================');

