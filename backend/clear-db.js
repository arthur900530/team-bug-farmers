#!/usr/bin/env node
/**
 * Script to clear all data from database
 * Usage: node clear-db.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'audio-states.db'));

console.log('⚠️  WARNING: This will delete ALL user states from the database!');
console.log('');

try {
  const count = db.prepare('SELECT COUNT(*) as count FROM user_states').get();
  console.log(`Current users in database: ${count.count}`);
  
  if (count.count > 0) {
    const result = db.prepare('DELETE FROM user_states').run();
    console.log(`✅ Deleted ${result.changes} user state(s)`);
  } else {
    console.log('Database is already empty.');
  }
} catch (error) {
  console.error('Error clearing database:', error.message);
} finally {
  db.close();
}

