#!/usr/bin/env node

/**
 * Auto-sync database to Git after changes
 * Run this after uploading banner, logo, or news
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'peta-narkoba.db');

console.log('🔄 AUTO-SYNC DATABASE TO GIT\n');
console.log('=' .repeat(60));

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

// Get database file size and timestamp
const stats = fs.statSync(DB_PATH);
console.log(`\n📦 Database: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`📅 Modified: ${stats.mtime.toLocaleString('id-ID')}`);

try {
  // Check if there are changes
  console.log('\n🔍 Checking for changes...');
  const status = execSync('git status --porcelain data/peta-narkoba.db', { encoding: 'utf8' });
  
  if (!status.trim()) {
    console.log('✅ No changes detected - database already up to date');
    console.log('\n💡 Database sudah ter-commit, tidak perlu update');
    process.exit(0);
  }
  
  console.log('📝 Changes detected - committing database...\n');
  
  // Add database file
  execSync('git add data/peta-narkoba.db', { stdio: 'inherit' });
  
  // Create commit message with timestamp
  const timestamp = new Date().toLocaleString('id-ID');
  const commitMsg = `Auto-sync: Update database [${timestamp}]

Updated database includes:
- Banner images (BLOB)
- Logo images (BLOB)
- News articles with images (BLOB)
- Map points coordinates

This commit ensures data persistence on Railway deployment.`;
  
  execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
  
  console.log('\n✅ Database committed successfully!');
  console.log('\n🚀 Next step: Push to GitHub');
  console.log('   Run: git push origin main');
  console.log('\n💡 Atau jalankan: npm run sync-push');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

console.log('=' .repeat(60));
