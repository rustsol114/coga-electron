# Building Windows Executable from Linux

When building Windows executables from Linux, electron-builder requires Wine to be installed.

## Option 1: Install Wine (Recommended for Cross-Platform Building)

### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install wine64 wine32 xvfb
```

### Fedora/RHEL:
```bash
sudo dnf install wine xorg-x11-server-Xvfb
```

### Verify Installation:
```bash
wine --version
Xvfb -help
```

### Initialize Wine (First Time Only):
```bash
# This will create the Wine prefix
WINEPREFIX="$HOME/.wine" WINEARCH=win64 winecfg
# Or use the setup script:
./scripts/setup-wine-headless.sh
```

### Build Windows Executable:
```bash
npm run electron:build:win
```

**Note:** The build script will automatically:
- Check for Wine installation
- Configure Wine for headless operation
- Start Xvfb (virtual display) if needed
- Set proper environment variables

## Option 2: Build Only for Linux

If you only need Linux builds, use:
```bash
npm run electron:build:linux
```

## Option 3: Build on Windows Machine

If Wine installation is problematic, you can:
1. Build on a Windows machine directly
2. Use GitHub Actions or similar CI/CD for Windows builds
3. Use a Windows VM or container

## Option 4: Use Docker with Wine

You can also use a Docker container with Wine pre-installed for building Windows executables.

## Troubleshooting

### Error: "could not load kernel32.dll" or "nodrv_CreateWindow"

This error occurs when Wine tries to access a display that doesn't exist. Fix it by:

1. **Install Xvfb (Virtual Display):**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install xvfb
   
   # Fedora/RHEL
   sudo dnf install xorg-x11-server-Xvfb
   ```

2. **Run the setup script:**
   ```bash
   ./scripts/setup-wine-headless.sh
   ```

3. **Initialize Wine prefix manually:**
   ```bash
   export DISPLAY=:99
   Xvfb :99 -screen 0 1024x768x24 &
   WINEPREFIX="$HOME/.wine" WINEARCH=win64 wineboot --init
   ```

4. **Try building again:**
   ```bash
   npm run electron:build:win
   ```

### Other Common Issues

1. **Wine not found:**
   - Make sure Wine is in your PATH: `which wine`
   - Install Wine: `sudo apt-get install wine64 wine32`

2. **Wine prefix not initialized:**
   - Initialize Wine: `winecfg` (first run will set up Wine prefix)
   - Or use: `WINEPREFIX="$HOME/.wine" WINEARCH=win64 wineboot --init`

3. **Permission errors:**
   - Make sure scripts are executable: `chmod +x scripts/*.sh scripts/*.js`

4. **Build still fails:**
   - Check if Xvfb is running: `pgrep -f "Xvfb :99"`
   - Check Wine environment: `env | grep WINE`
   - Try building only for Linux: `npm run electron:build:linux`

