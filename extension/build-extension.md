# Building the Extension

## Prerequisites

1. Build the COGA script:
```bash
npm run build:extension
```

2. Create icons (or use placeholder):
   - Place PNG files (16x16, 48x48, 128x128) in `extension/icons/`
   - Or open `extension/icons/create-icons.html` in a browser to generate them

## Structure After Build

```
extension/
├── manifest.json         ✅
├── background.js        ✅
├── content.js           ✅
├── popup.html           ✅
├── popup.js             ✅
├── coga.min.js          ✅ (after build)
├── icons/
│   ├── icon16.png       ⚠️ (create manually)
│   ├── icon48.png       ⚠️ (create manually)
│   └── icon128.png      ⚠️ (create manually)
└── src/                 ✅ (source files)
```

## Quick Icon Creation

1. Open `extension/icons/create-icons.html` in Chrome
2. Icons will auto-download
3. Place them in `extension/icons/`

Or create simple green circle icons using any image editor.

