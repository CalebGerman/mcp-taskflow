#!/usr/bin/env node

/**
 * Copy UI build artifacts to dist/ui directory
 * This script runs after the main build to ensure UI assets are available
 */

import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const uiSrc = join(rootDir, 'ui', 'dist');
const uiDest = join(rootDir, 'dist', 'ui');

function copyDirectory(src, dest) {
  if (!existsSync(src)) {
    console.log('⚠️  UI build not found at:', src);
    console.log('⚠️  Run "cd ui && npm run build" to build the UI');
    return;
  }

  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying UI assets...');
copyDirectory(uiSrc, uiDest);
console.log('✅ UI assets copied to dist/ui/');
