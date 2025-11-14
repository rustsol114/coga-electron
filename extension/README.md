# COGA Chrome Extension

This directory contains the Chrome Extension implementation of COGA Assistant.

## 🚀 Quick Start

### Build the Extension

```bash
# Build the COGA script for extension
npm run build:extension

# Or build in development mode
npm run build:extension:dev
```

### Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `extension/` directory from this project
5. The extension will appear in your extensions list

### First Time Setup

1. Click the COGA extension icon in your toolbar
2. Set a password (minimum 4 characters)
3. Click "Set Password" to unlock the extension
4. The extension will now auto-inject on all pages

## 🔐 Password Protection

- The extension is **locked by default**
- You must set a password on first use
- Password is hashed using SHA-256 and stored securely
- Extension must be unlocked before COGA will work on pages

## 📁 Extension Structure

```
extension/
├── manifest.json          # Extension manifest (Chrome config)
├── background.js          # Service worker (background script)
├── content.js             # Content script (auto-injection)
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic (unlock/lock)
├── coga.min.js            # Main COGA script (built)
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/utils/
    ├── ChromeStorageManager.ts  # Chrome storage wrapper
    └── storage.ts               # Unified storage (auto-detects context)
```

## 🔧 Development

### Building

```bash
# Production build
npm run build:extension

# Development build with source maps
npm run build:extension:dev

# Watch mode
npm run watch:extension
```

### Testing

1. Build the extension: `npm run build:extension`
2. Load it in Chrome (see above)
3. Visit any website
4. COGA should auto-inject (if unlocked)
5. The widget should appear automatically

## 🌐 Extension Features

- **Automatic injection**: Widget appears automatically on all pages
- **Cross-domain sync**: Full synchronization across all tabs and windows
- **Persistent storage**: Data persists across sessions using chrome.storage.local
- **Global calibration**: Single calibration works across all domains
- **Password protection**: Secure access control

## 📝 Manifest Permissions

- `storage`: For chrome.storage.local
- `tabs`: For checking active tabs
- `activeTab`: For current page access
- `<all_urls>`: For injecting on all websites

## 🔒 Privacy & Security

- Extension is **private** (not on Chrome Web Store)
- Password-protected for controlled distribution
- Suitable for up to 25 selected users
- All data stored locally (chrome.storage.local)
- No external API calls or data transmission

## 🐛 Troubleshooting

### Extension Not Working

1. Check if extension is unlocked (click icon)
2. Check browser console for errors
3. Verify extension is loaded in `chrome://extensions/`
4. Try reloading the extension (click refresh icon)

### Password Issues

- If you forget your password, you need to:
  1. Go to `chrome://extensions/`
  2. Find COGA extension
  3. Click "Remove" to reset
  4. Reinstall and set new password

### COGA Not Injecting

1. Ensure extension is unlocked
2. Check that domain is not suppressed in settings
3. Verify content script is enabled
4. Try refreshing the page

## 📦 Distribution

For distributing to 25 users:

1. Build production: `npm run build:extension`
2. Zip the `extension/` folder
3. Share the zip file with selected users
4. Users load it as "unpacked" extension
5. Each user sets their own password

**Note**: This is a development distribution method. For production, consider Chrome Web Store (unlisted) or Enterprise policy distribution.

## 🎯 Core Features

- **Stress Detection**: Real-time behavioral analysis
- **Interventions**: Box Breathing, Eye Rest, Micro Break
- **Calibration**: Personalized baseline detection
- **Settings**: Configurable sensitivity and preferences
- **Synchronization**: Real-time sync across all tabs

