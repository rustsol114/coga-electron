# iohook Installation & Setup Guide

## Quick Start

1. **Install iohook:**
   ```bash
   npm install
   ```

2. **If installation fails**, you may need to rebuild for Electron:
   ```bash
   npm rebuild iohook --runtime=electron --target=<your-electron-version>
   ```
   
   To find your Electron version:
   ```bash
   npm list electron
   ```

3. **Run the app:**
   ```bash
   npm run electron:dev
   ```

## What to Check

When you start the app, look for these messages in the console:

### ✅ Success Messages:
- `[SystemEvents] iohook loaded successfully`
- `[SystemEvents] Using iohook for mouse/scroll detection (PRIMARY METHOD)`
- `[SystemEvents] ✓ iohook started successfully!`
- `[SystemEvents] ✓ iohook is running - ready to capture events`

### ❌ Error Messages:
- `[SystemEvents] iohook not available` - iohook didn't install/compile
- `[SystemEvents] ⚠ iohook is REQUIRED but not available!` - Need to install

## Testing

1. **Click your mouse** - You should see:
   ```
   [SystemEvents] ✓ iohook: Mouse click detected - button=0 (left) at (X, Y)
   ```

2. **Scroll your mouse wheel** - You should see:
   ```
   [SystemEvents] ✓ iohook: Scroll detected (down) at (X, Y)
   ```

## Troubleshooting

### "Cannot find module 'iohook'"
- Run `npm install` again
- Check `node_modules/iohook` exists

### "Module version mismatch"
- Rebuild iohook for Electron:
  ```bash
  npm rebuild iohook --runtime=electron --target=28.0.0
  ```
  (Replace 28.0.0 with your Electron version)

### "iohook not available" error
- Check console for the specific error message
- May need Visual Studio Build Tools (Windows) or Xcode (macOS)
- Try: `npm install --build-from-source`

### Events not detected
- Check console logs - first 5 events are logged with full event objects
- Verify button mapping is correct (check the logged button values)
- Make sure iohook started successfully

## Platform-Specific Notes

### Windows
- Usually works without special permissions
- May need Visual Studio Build Tools for compilation

### macOS
- May require "Input Monitoring" permission
- Go to: System Preferences > Security & Privacy > Privacy > Input Monitoring
- Add your app to the list

### Linux
- May need: `sudo apt-get install libxkbcommon-x11-0`

## Current Configuration

The app is now configured to:
- ✅ Use iohook as PRIMARY method
- ✅ Fall back to alternatives only if iohook fails
- ✅ Log detailed event information for debugging
- ✅ Handle different button/rotation mappings automatically

