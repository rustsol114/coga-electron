# COGA MVP - Phase 1 Setup Complete

## ✅ What Has Been Created

### Project Structure
```
coga-mvp/
├── .git/                        # Local Git repository initialized
├── src/                         # Source code
│   ├── core/                    # Core detection modules
│   │   ├── EventCapture.js      # Browser event listeners (mouse, keyboard, scroll)
│   │   ├── BaselineManager.js   # Personal baseline calibration (3-min)
│   │   └── StressDetector.js    # Z-score stress calculation
│   ├── interventions/           # Intervention modules
│   │   ├── BoxBreathing.js      # 4-4-4-4 breathing exercise
│   │   ├── EyeRest.js          # 20-20-20 rule reminder
│   │   ├── MicroBreak.js       # 30-second break prompts
│   │   └── InterventionManager.js # Orchestrates interventions
│   ├── rules/
│   │   └── AnnoyanceRules.js   # Prevents intervention fatigue
│   ├── ui/
│   │   └── Widget.js           # Floating indicator widget
│   ├── utils/
│   │   ├── storage.js          # LocalStorage wrapper
│   │   └── analytics.js        # Anonymous event logging
│   ├── COGA.js                 # Main orchestration class
│   └── index.js                # Entry point
├── public/
│   └── index.html              # Development test page
├── dist/                       # Build output
│   ├── coga.min.js            # Production bundle (91KB)
│   └── index.html             # Built test page
├── .babelrc                    # Babel configuration
├── webpack.config.js           # Webpack build configuration
├── package.json               # Dependencies and scripts
├── README.md                  # Full documentation
└── .gitignore                 # Git ignore rules
```

## 🎯 Phase 1 Features Implemented

### Core Detection Engine ✅
- [x] Mouse tracking (velocity, clicks, rage click detection)
- [x] Keyboard tracking (typing speed, backspace rate, pause patterns)
- [x] Scroll velocity monitoring
- [x] 3-minute baseline calibration using Median + MAD
- [x] Z-score stress calculation
- [x] Real-time stress level detection (low, normal, elevated, high, critical)

### Interventions ✅
- [x] **Box Breathing**: Visual guide with 4-4-4-4 pattern (15/30/60 seconds)
- [x] **Eye Rest Reminder**: 20-20-20 rule implementation
- [x] **Micro-Break Prompt**: Stand/stretch suggestions with timer

### Annoyance Prevention ✅
- [x] 8-minute cooldown between interventions
- [x] Maximum 3 interventions per hour
- [x] Maximum 12 interventions per day
- [x] Auto-snooze after 2 consecutive dismissals
- [x] Disabled during password fields
- [x] Paused during video playback
- [x] Blocked in fullscreen mode

### UI/Widget ✅
- [x] Minimal floating dot indicator
- [x] Color-coded stress levels (green/blue/yellow/orange/red)
- [x] Expandable panel with detailed metrics
- [x] Draggable positioning
- [x] Calibration progress display

### Data Collection ✅
- [x] Anonymous event logging
- [x] Local storage with batch processing
- [x] Usage statistics tracking
- [x] Privacy-first design (no PII)

## 🚀 How to Run

### 1. Development Mode
```bash
npm run dev
```
Opens `http://localhost:3000` with hot reload.

### 2. Production Build
```bash
npm run build
```
Creates `dist/coga.min.js` (91KB minified).

### 3. Watch Mode
```bash
npm run watch
```
Continuous build during development.

## 📊 Build Information

- **Production Bundle**: 91KB (minified + source maps)
- **Gzipped Size**: ~30KB (estimated)
- **Target**: < 100KB for Phase 1 ✅
- **Optimization**: Code splitting and tree shaking enabled

## 🧪 Testing the Application

### Development Server
1. The server should now be running at `http://localhost:3000`
2. Open this URL in your browser (Chrome, Firefox, or Edge recommended)

### What to Expect
1. **First Load**: 3-minute baseline calibration will start
   - A progress indicator appears on the widget
   - Use your mouse and keyboard normally during this time
   
2. **After Calibration**: Stress detection begins
   - The floating widget shows your stress level via color
   - Click the widget to see detailed metrics
   
3. **Triggering Interventions**: Generate stress signals by:
   - Typing very quickly
   - Using backspace frequently
   - Making rapid mouse movements
   - Clicking repeatedly in one spot (rage clicks)
   
4. **Intervention Flow**:
   - When stress exceeds threshold (2.5 z-score), an intervention appears
   - Complete or dismiss the intervention
   - Next intervention blocked for 8 minutes (cooldown)

### Browser Console Commands
Open DevTools (F12) and try:

```javascript
// View status
window.COGA.getStatus()

// Get statistics
await window.COGA.getStatistics()

// Adjust sensitivity
await window.COGA.setSensitivity('high') // 'low', 'medium', or 'high'

// Disable/enable interventions
await window.COGA.setEnabled(false)
await window.COGA.setEnabled(true)

// Reset all data (including baseline)
await window.COGA.reset()
```

## 🔧 Configuration

### Sensitivity Levels
- **Low**: Threshold 3.5 (fewer interventions)
- **Medium**: Threshold 2.5 (default, balanced)
- **High**: Threshold 1.5 (more interventions)

### Annoyance Rules
```javascript
{
  maxPerHour: 3,           // Max 3 interventions per hour
  maxPerDay: 12,           // Max 12 per day
  cooldownMs: 480000,      // 8 minutes between interventions
  autoSnoozeAfterDismissals: 2,  // Snooze after 2 dismissals
  snoozeTimeMs: 1800000    // 30-minute snooze
}
```

## 📝 Git Repository

A local Git repository has been initialized with the initial commit:

```bash
# View commit history
git log

# Check status
git status

# Create a new branch for features
git checkout -b feature/your-feature-name
```

## 🐛 Troubleshooting

### Widget Not Appearing
- Check browser console for errors
- Ensure JavaScript is enabled
- Try refreshing the page (Ctrl+R or Cmd+R)

### No Interventions Triggering
- Complete the 3-minute calibration first
- Generate more activity (type fast, click rapidly)
- Lower sensitivity: `window.COGA.setSensitivity('high')`
- Check if snoozed: `window.COGA.interventionManager.annoyanceRules.isSnoozed()`

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Port 3000 Already in Use
Edit `webpack.config.js` and change the port:
```javascript
devServer: {
  port: 3001, // Change to any available port
}
```

## 📦 Dependencies

### Production
- `core-js`: ^3.33.0 (Polyfills for browser compatibility)

### Development
- `webpack`: ^5.89.0 (Module bundler)
- `webpack-cli`: ^5.1.4 (CLI for Webpack)
- `webpack-dev-server`: ^4.15.1 (Development server)
- `babel-loader`: ^9.1.3 (JavaScript transpiler)
- `@babel/core`: ^7.23.0 (Babel compiler)
- `@babel/preset-env`: ^7.23.0 (Babel preset)
- `html-webpack-plugin`: ^5.5.3 (HTML generation)
- `style-loader`: ^3.3.3 (CSS injection)
- `css-loader`: ^6.8.1 (CSS loading)

## 🎨 Architecture Highlights

### Modular Design
Each component is self-contained and can be tested independently:
- **EventCapture**: Tracks user interactions
- **BaselineManager**: Establishes personal norms
- **StressDetector**: Calculates deviation from baseline
- **InterventionManager**: Decides when and what to show
- **AnnoyanceRules**: Prevents over-triggering
- **Widget**: Displays current state

### Error Handling
Every function includes try-catch blocks with descriptive error messages logged to console with `[COGA]` prefix.

### Privacy-First
- No external API calls in Phase 1
- All data stored locally (localStorage)
- No PII collected
- Anonymous event logging only

### Performance Optimized
- Event throttling for mouse/scroll
- Efficient z-score calculation
- Minimal DOM manipulation
- Lazy intervention loading

## 🚦 Next Steps

### Immediate
1. ✅ Test the application at `http://localhost:3000`
2. ✅ Verify all 3 interventions work
3. ✅ Check widget behavior and styling
4. ✅ Test on different browsers

### Phase 2 Planning (Weeks 3-4)
- [ ] Add 3 more interventions (6 total)
- [ ] Implement Chrome extension scaffold
- [ ] Add contextual baselines (morning/afternoon/evening)
- [ ] Create basic dashboard for insights
- [ ] Improve detection with scroll patterns
- [ ] Add adaptive intervention selection

### Future Phases
- **Phase 3**: Whoop integration, team features, API
- **Phase 4**: Additional wearables, AI/ML, enterprise features

## 📞 Support

For issues or questions:
1. Check browser console for `[COGA]` logs
2. Review the README.md for detailed documentation
3. Test with different sensitivity levels
4. Reset if needed: `await window.COGA.reset()`

---

**Status**: ✅ Phase 1 Complete and Ready for Testing
**Version**: 0.1.0
**Date**: October 2024
**Tech Stack**: Webpack 5, Babel, Vanilla JavaScript (ES6+)

