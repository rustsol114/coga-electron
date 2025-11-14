#!/usr/bin/env node
/**
 * Check if Wine is installed for Windows builds
 * Configure Wine for headless operation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function checkWine() {
  try {
    execSync('wine --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function configureWineForHeadless() {
  // Set environment variables for headless Wine operation
  // Use virtual display if available, otherwise use :0
  const display = process.env.DISPLAY || ':99';
  
  process.env.DISPLAY = display;
  process.env.WINEDLLOVERRIDES = 'winemenubuilder.exe=d;mscoree=d;mshtml=d';
  process.env.WINEDEBUG = '-all';
  process.env.WINEARCH = 'win64';
  
  // Try to start Xvfb if not already running
  try {
    execSync(`pgrep -f "Xvfb :99"`, { stdio: 'ignore' });
  } catch (e) {
    // Xvfb not running, try to start it
    try {
      execSync('Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &', { stdio: 'ignore' });
      // Give Xvfb a moment to start
      setTimeout(() => {}, 1000);
    } catch (xvfbError) {
      // Xvfb not available, will use regular display or fail gracefully
      console.warn('⚠️  Xvfb not available. Wine may need a display server.');
    }
  }
}

const args = process.argv.slice(2);
const isWindowsBuild = args.some(arg => arg.includes('--win') || arg.includes('win'));

if (isWindowsBuild && !checkWine()) {
  console.error('\n❌ Wine is not installed!');
  console.error('\nTo build Windows executables from Linux, you need Wine.');
  console.error('\nInstallation instructions:');
  console.error('  Ubuntu/Debian: sudo apt-get install wine64 wine32');
  console.error('  Fedora/RHEL:   sudo dnf install wine');
  console.error('\nAfter installation, run: winecfg (to initialize Wine)');
  console.error('\nAlternatively, build only for Linux:');
  console.error('  npm run electron:build:linux');
  console.error('\nSee BUILD_WINDOWS.md for more details.\n');
  process.exit(1);
}

if (isWindowsBuild) {
  // Configure Wine for headless operation
  configureWineForHeadless();
  console.log('✓ Wine configured for headless build');
}

process.exit(0);

