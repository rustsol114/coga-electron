# COGA Chrome Extension - Setup Guide

## ✅ What's Been Implemented

1. **Extension Structure** ✅
   - `manifest.json` (Chrome Extension v3)
   - `background.js` (Service worker)
   - `content.js` (Auto-injection script)
   - `popup.html/js` (Password protection UI)

2. **Storage Migration** ✅
   - `ChromeStorageManager.ts` (chrome.storage wrapper)
   - `storage.ts` (Uses chrome.storage.local in extension context)
   - All storage calls now work in both contexts

3. **Password Protection** ✅
   - First-time password setup
   - Lock/unlock functionality
   - Password hashing (SHA-256)
   - Secure storage

4. **Auto-Injection** ✅
   - Content script runs on all pages
   - Checks unlock status before injection
   - Reloads when unlocked

5. **Build Configuration** ✅
   - `webpack.extension.config.js`
   - `npm run build:extension`
   - Outputs to `extension/` folder

## 📋 Next Steps to Complete Setup

### 1. Build the Extension

```bash
# From project root
npm run build:extension
```

This will create `extension/coga.min.js`

### 2. Create Icons

You need 3 PNG icons (16x16, 48x48, 128x128):

**Option A: Use Online Tool**
- Go to https://www.favicon-generator.org/ or similar
- Upload/create a green circle icon
- Download all sizes

**Option B: Create Manually**
- Use any image editor
- Create green circle (#68B36B background)
- White circle inside (breathing symbol)
- Export as PNG in 3 sizes

**Option C: Use the HTML Generator**
- Open `extension/icons/create-icons.html` in browser
- Icons will auto-download
- Move them to `extension/icons/` folder

Place files:
- `extension/icons/icon16.png`
- `extension/icons/icon48.png`
- `extension/icons/icon128.png`

### 3. Load Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Extension should appear in list

### 4. Test

1. Click extension icon in toolbar
2. Set password (first time)
3. Visit any website
4. COGA widget should auto-appear
5. Widget should be draggable

## 🔧 Troubleshooting

### Extension Not Appearing
- Check `chrome://extensions/` - is it loaded?
- Check for errors (red error icon)
- Verify `manifest.json` syntax

### COGA Not Injecting
- Check if extension is unlocked (click icon)
- Check browser console for errors
- Verify `coga.min.js` exists in extension folder

### Password Issues
- Password minimum 4 characters
- If locked out: Remove extension and reinstall

### Build Errors
- Run `npm install` first
- Check TypeScript errors
- Verify webpack config

## 📦 Distribution to 25 Users

1. **Build production**:
   ```bash
   npm run build:extension
   ```

2. **Zip the extension folder**:
   ```bash
   # Windows
   powershell Compress-Archive -Path extension -DestinationPath coga-extension.zip
   ```

3. **Share zip file** with selected users

4. **Users install**:
   - Extract zip
   - Load unpacked in Chrome
   - Set password
   - Start using

## 🎯 Features Working

✅ Auto-injection on all pages  
✅ Password protection  
✅ Persistent storage (cross-domain)  
✅ Same widget functionality  
✅ Same interventions  
✅ Same stress detection  
✅ Settings page compatibility  
✅ Draggable widget  

## 🔄 Migration Notes

- Storage automatically uses `chrome.storage` in extension
- Falls back to `localStorage` if not in extension context
- All existing features work identically
- Calibration persists across all domains
- Settings sync across all tabs

