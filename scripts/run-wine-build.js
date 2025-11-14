#!/usr/bin/env node
/**
 * Run electron-builder for Windows with proper Wine configuration
 */

const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Configure Wine environment
process.env.WINEDLLOVERRIDES = 'winemenubuilder.exe=d;mscoree=d;mshtml=d';
process.env.WINEDEBUG = '-all';

// Try to use virtual display if available
let display = process.env.DISPLAY || ':99';

// Check if Xvfb is running on :99
let xvfbRunning = false;
try {
  execSync('pgrep -f "Xvfb :99"', { stdio: 'ignore' });
  xvfbRunning = true;
  display = ':99';
} catch (e) {
  // Try to start Xvfb
  try {
    execSync('which Xvfb', { stdio: 'ignore' });
    console.log('Starting virtual display (Xvfb)...');
    const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1024x768x24'], {
      detached: true,
      stdio: 'ignore'
    });
    xvfb.unref();
    // Wait for Xvfb to start
    let attempts = 0;
    while (attempts < 10) {
      try {
        execSync('pgrep -f "Xvfb :99"', { stdio: 'ignore' });
        xvfbRunning = true;
        display = ':99';
        break;
      } catch (e) {
        attempts++;
        // Wait 200ms before next check using setTimeout equivalent
        if (attempts < 10) {
          const start = Date.now();
          while (Date.now() - start < 200) {
            // Busy wait
          }
        }
      }
    }
    if (!xvfbRunning) {
      console.warn('⚠️  Xvfb failed to start. Using default display.');
      display = process.env.DISPLAY || ':0';
    }
  } catch (xvfbError) {
    // Xvfb not available, try default display
    display = process.env.DISPLAY || ':0';
    console.warn('⚠️  Xvfb not available. Using default display.');
  }
}

// Ensure Wine prefix is initialized
const winePrefix = process.env.WINEPREFIX || path.join(os.homedir(), '.wine');

if (!fs.existsSync(winePrefix)) {
  console.log('Initializing Wine prefix...');
  process.env.WINEPREFIX = winePrefix;
  process.env.WINEARCH = 'win64';
  try {
    execSync('wineboot --init', { 
      stdio: 'ignore',
      env: { ...process.env, DISPLAY: display }
    });
    console.log('✓ Wine prefix initialized');
  } catch (error) {
    console.warn('⚠️  Could not initialize Wine prefix automatically. Run: winecfg');
  }
}

process.env.DISPLAY = display;

// Run electron-builder
console.log(`Building Windows executable with DISPLAY=${display}...`);
const builder = spawn('npx', ['electron-builder', '--win'], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

builder.on('close', (code) => {
  process.exit(code);
});

builder.on('error', (error) => {
  console.error('Error running electron-builder:', error);
  process.exit(1);
});

