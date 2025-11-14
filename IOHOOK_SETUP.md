# iohook Setup Guide

## Installation

iohook has been added to `package.json`. To install it:

```bash
npm install
```

## Important Notes

### Native Module Compilation

iohook is a native Node.js module that requires compilation. It should automatically compile during `npm install`, but if you encounter issues:

1. **Windows**: Make sure you have:
   - Visual Studio Build Tools or Visual Studio with C++ workload
   - Python 2.7 or 3.x
   - Node.js development headers

2. **If compilation fails**, you may need to:
   ```bash
   npm install --build-from-source
   ```

### Electron Compatibility

iohook needs to be built for the specific Electron version you're using. If you get module loading errors:

1. Check that iohook was built for your Electron version
2. You may need to rebuild iohook for Electron:
   ```bash
   npm rebuild iohook --runtime=electron --target=<electron-version>
   ```

### Permissions

- **Windows**: Usually works without special permissions
- **macOS**: May require "Input Monitoring" permission in System Preferences > Security & Privacy
- **Linux**: May require additional libraries (see iohook documentation)

## How It Works

1. **Primary Method**: iohook is used for system-wide mouse click and scroll detection
2. **Fallback**: If iohook fails to load, the system falls back to PowerShell-based detection (Windows only)

## Verification

When you start the app, check the console for:
- `[SystemEvents] iohook loaded successfully` - iohook is available
- `[SystemEvents] ✓ iohook started successfully` - iohook is running
- `[SystemEvents] ✓ iohook: Mouse click detected` - clicks are being detected
- `[SystemEvents] ✓ iohook: Scroll detected` - scrolls are being detected

If you see fallback messages, iohook didn't load and PowerShell method is being used.

## Troubleshooting

### "Cannot find module 'iohook'"
- Run `npm install` again
- Check that iohook is in `node_modules/iohook`

### "Module version mismatch"
- Rebuild iohook for your Electron version
- Or use the fallback PowerShell method (Windows only)

### Events not detected
- Check console logs to see if iohook started
- Verify permissions (especially on macOS)
- Try the fallback method if iohook isn't working

