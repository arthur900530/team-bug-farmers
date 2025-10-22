#!/usr/bin/env node

/**
 * Cleanup Script for Inactive Users
 * 
 * This script removes user entries from the database that haven't been updated
 * for a specified number of days (default: 30 days).
 * 
 * Usage:
 *   node cleanup-inactive.js [days]
 * 
 * Examples:
 *   node cleanup-inactive.js      # Remove entries older than 30 days
 *   node cleanup-inactive.js 7    # Remove entries older than 7 days
 */

import { cleanupOldEntries } from './database.js';

// Get days from command line argument or use default
const daysOld = process.argv[2] ? parseInt(process.argv[2], 10) : 30;

if (isNaN(daysOld) || daysOld < 1) {
  console.error('❌ Invalid number of days. Please provide a positive integer.');
  process.exit(1);
}

console.log(`\n🧹 Cleaning up inactive user entries...`);
console.log(`   Removing entries older than ${daysOld} days\n`);

try {
  const deletedCount = cleanupOldEntries(daysOld);
  
  if (deletedCount === 0) {
    console.log('✅ No inactive entries found. Database is clean!');
  } else {
    console.log(`✅ Successfully removed ${deletedCount} inactive ${deletedCount === 1 ? 'entry' : 'entries'}`);
  }
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}

process.exit(0);

