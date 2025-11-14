# 🚀 Quick Start - COGA Chrome Extension

## Build & Install (3 Steps)

### 1. Build
```bash
npm run build:extension
```

### 2. Create Icons (Quick)
- Open `extension/icons/create-icons.html` in Chrome
- Icons auto-download → Move to `extension/icons/`
- OR create 3 PNG files (16x16, 48x48, 128x128) manually

### 3. Load in Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Done! ✅

## First Use

1. Click COGA icon in toolbar
2. Set password (min 4 chars)
3. Click "Set Password"
4. Extension unlocked! 🎉

## Test

Visit any website → COGA widget appears automatically!

## Troubleshooting

- **Widget not appearing?** → Check if extension is unlocked
- **Build errors?** → Run `npm install` first
- **Icons missing?** → Extension still works, just no icon shown

## Distribution

1. Build: `npm run build:extension`
2. Zip `extension/` folder
3. Share with users
4. Users load as unpacked extension

---

**That's it!** The extension automatically loads on all pages. 🚀

