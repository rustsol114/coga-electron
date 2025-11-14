#!/bin/bash
# Setup Wine for headless Windows builds

# Check if Xvfb is available (virtual framebuffer for headless operation)
if ! command -v Xvfb &> /dev/null; then
    echo "⚠️  Xvfb not found. Installing xvfb for headless Wine operation..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y xvfb
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y xorg-x11-server-Xvfb
    elif command -v yum &> /dev/null; then
        sudo yum install -y xorg-x11-server-Xvfb
    else
        echo "⚠️  Please install xvfb manually for headless builds"
    fi
fi

# Configure Wine environment variables for headless operation
export WINEDLLOVERRIDES="winemenubuilder.exe=d;mscoree=d;mshtml=d"
export WINEDEBUG="-all"
export DISPLAY=:99

# Initialize Wine prefix if it doesn't exist
if [ ! -d "$HOME/.wine" ]; then
    echo "Initializing Wine prefix (this may take a moment)..."
    export WINEPREFIX="$HOME/.wine"
    export WINEARCH=win64
    export DISPLAY=:99
    
    # Start Xvfb if not running
    if ! pgrep -f "Xvfb :99" > /dev/null; then
        Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
        sleep 2
    fi
    
    # Initialize Wine prefix (silent mode)
    wineboot --init 2>/dev/null || true
    echo "✓ Wine prefix initialized"
else
    echo "✓ Wine prefix already exists"
fi

echo "✓ Wine configured for headless build"

