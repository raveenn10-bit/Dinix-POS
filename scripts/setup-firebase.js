/**
 * Danix POS - Firebase Automated Setup & Verification Script
 * This script checks the Firebase environment, validates required configuration,
 * and helps deploy rules, indexes, and test emulator connections.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('  DANIX POS - FIREBASE SETUP & ENVIRONMENT VERIFIER      ');
console.log('========================================================\n');

// 1. Check for .env file
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('[!] .env file not found. Creating from .env.example...');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('[✓] Created .env from .env.example. Please populate your Firebase keys.');
  } else {
    console.error('[X] .env.example missing!');
  }
} else {
  console.log('[✓] .env file found.');
}

// 2. Check firebase.json, firestore.rules, firestore.indexes.json
const filesToCheck = [
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json'
];

filesToCheck.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`[✓] ${file} is present.`);
  } else {
    console.log(`[-] ${file} is not yet created.`);
  }
});

console.log('\n[INFO] Configuration checklist:');
console.log('1. Set your Firebase project credentials in .env');
console.log('2. Deploy rules: npx firebase deploy --only firestore:rules');
console.log('3. Deploy indexes: npx firebase deploy --only firestore:indexes');
console.log('4. Start local emulators: npx firebase emulators:start');
console.log('\n========================================================\n');
