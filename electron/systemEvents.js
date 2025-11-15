/**
 * systemEvents.js
 * System-level event capture for Electron
 * Uses PowerShell-based mouse hooks and node-global-key-listener (no iohook).
 */

const { screen, globalShortcut } = require('electron');
const { spawn } = require('child_process');

let GlobalKeyboardListener = null;
let GlobalKeyboardListenerAvailable = false;
try {
  const gklModule = require('node-global-key-listener');
  GlobalKeyboardListener = gklModule.GlobalKeyboardListener || gklModule.default || gklModule;
  if (GlobalKeyboardListener) {
    GlobalKeyboardListenerAvailable = true;
    console.log('[SystemEvents] node-global-key-listener loaded successfully');
  }
} catch (error) {
  console.warn('[SystemEvents] node-global-key-listener not available:', error.message);
  console.warn('[SystemEvents] System-wide keyboard detection will be limited');
}

const isWindows = process.platform === 'win32';

const POWER_SHELL_MOUSE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @"
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class GlobalMouseHook
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_LBUTTONDOWN = 0x0201;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_MBUTTONDOWN = 0x0207;
    private const int WM_MOUSEWHEEL = 0x020A;

    private static IntPtr _hookId = IntPtr.Zero;
    private static HookProc _proc = HookCallback;

    public static void Run()
    {
        _hookId = SetHook(_proc);
        Application.Run();
        UnhookWindowsHookEx(_hookId);
    }

    private static IntPtr SetHook(HookProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int msg = wParam.ToInt32();
            MSLLHOOKSTRUCT hookStruct = Marshal.PtrToStructure<MSLLHOOKSTRUCT>(lParam);
            long timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            string payload = null;

            if (msg == WM_LBUTTONDOWN || msg == WM_RBUTTONDOWN || msg == WM_MBUTTONDOWN)
            {
                string button = msg == WM_LBUTTONDOWN ? "left" : msg == WM_RBUTTONDOWN ? "right" : "middle";
                payload = $"{{\"type\":\"click\",\"button\":\"{button}\",\"x\":{hookStruct.pt.x},\"y\":{hookStruct.pt.y},\"timestamp\":{timestamp}}}";
            }
            else if (msg == WM_MOUSEWHEEL)
            {
                int delta = (short)((hookStruct.mouseData >> 16) & 0xffff);
                string direction = delta > 0 ? "up" : "down";
                payload = $"{{\"type\":\"scroll\",\"direction\":\"{direction}\",\"delta\":{delta},\"x\":{hookStruct.pt.x},\"y\":{hookStruct.pt.y},\"timestamp\":{timestamp}}}";
            }

            if (!string.IsNullOrEmpty(payload))
            {
                Console.WriteLine(payload);
                Console.Out.Flush();
            }
        }

        return CallNextHookEx(_hookId, nCode, wParam, lParam);
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT
    {
        public POINT pt;
        public int mouseData;
        public int flags;
        public int time;
        public IntPtr dwExtraInfo;
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, HookProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
"@
[GlobalMouseHook]::Run()
`;

function encodePowerShellScript(script) {
  return Buffer.from(script, 'utf16le').toString('base64');
}

class SystemEventCapture {
  constructor() {
    
    this.iohook = require('iohook');
    this.isActive = false;
    this.iohookListenersRegistered = false;
    this.lastMousePosition = null;
    this.lastScrollTime = null;
    this.lastRotation = 0;
    this.mousePollInterval = null;
    this.globalKeyListener = null;
    this.mouseHookProcess = null;
    this.mouseHookBuffer = '';
    this.mouseHookRestartTimeout = null;
    this.traceEnabled =
      process.env.COGA_SYSTEM_EVENTS_TRACE === '1' ||
      process.env.DEBUG_SYSTEM_EVENTS === '1';
    this.traceCounters = {};
    this.eventCallbacks = {
      mousemove: [],
      click: [],
      keydown: [],
      keyup: [],
      scroll: [],
    };
  }

  start() {
    if (this.isActive) {
      console.log('[SystemEvents] Already active');
      return;
    }

    // Register iohook listeners (only once)
    if (!this.iohookListenersRegistered) {
      this.iohook.on("mousedown", (event) => {
        // Determine button: 0 = left, 1 = middle, 2 = right
        let button = 0; // default to left
        if (event.button === 1 || event.button === 'middle') {
          button = 1;
        } else if (event.button === 2 || event.button === 'right') {
          button = 2;
        }
        
        const clickData = {
          x: event.x,
          y: event.y,
          button: button,
          timestamp: Date.now()
        };
        this.emit("click", clickData);
        console.log('Mouse down event:', clickData);
      });

      this.iohook.on("mousewheel", (event) => {
        const now = Date.now();
        // iohook rotation: positive = scroll up, negative = scroll down
        const deltaRotation = event.rotation || 0;
        const deltaY = deltaRotation * 120; // Convert to standard wheel delta
        const direction = deltaY > 0 ? 'up' : 'down';
        
        // Calculate velocity if we have previous scroll time
        let velocity = 0;
        if (this.lastScrollTime !== null) {
          const timeDiff = now - this.lastScrollTime;
          if (timeDiff > 0) {
            velocity = Math.abs(deltaY / (timeDiff / 1000));
          }
        }
        
        const scrollData = {
          x: event.x || 0,
          y: event.y || 0,
          direction: direction,
          delta: deltaY,
          deltaY: deltaY,
          deltaX: 0,
          velocity: velocity,
          timestamp: now
        };
        
        console.log("scroll event:", scrollData);
        this.emit("scroll", scrollData);
        
        this.lastRotation = deltaRotation;
        this.lastScrollTime = now;
      });
      
      this.iohookListenersRegistered = true;
    }
    
    this.iohook.start();

    this.isActive = true;
    console.log('[SystemEvents] Starting system-level monitoring (PowerShell + node-global-key-listener)');

    if (this.traceEnabled) {
      console.log('[SystemEvents] TRACE mode enabled (unset COGA_SYSTEM_EVENTS_TRACE or set to 0 to disable)');
    }

    this.startMousePolling();
    this.startSystemKeyboardDetection();

    if (isWindows) {
      this.startPowerShellMouseHook();
    } else {
      console.warn('[SystemEvents] PowerShell mouse hook only available on Windows');
    }
  }

  stop() {
    if (!this.isActive) {
      return;
    }

    console.log('[SystemEvents] Stopping system-level monitoring');
    this.isActive = false;

    if (this.mousePollInterval) {
      clearInterval(this.mousePollInterval);
      this.mousePollInterval = null;
    }

    this.stopSystemKeyboardDetection();
    this.stopPowerShellMouseHook();
    globalShortcut.unregisterAll();
  }

  startMousePolling() {
    if (this.mousePollInterval) {
      clearInterval(this.mousePollInterval);
    }

    const pollRateMs = 16;
    this.mousePollInterval = setInterval(() => {
      try {
        const point = screen.getCursorScreenPoint();
        const now = Date.now();

        if (!this.lastMousePosition || point.x !== this.lastMousePosition.x || point.y !== this.lastMousePosition.y) {
          const payload = {
            x: point.x,
            y: point.y,
            timestamp: now,
            screen: screen.getPrimaryDisplay().bounds,
          };

          this.lastMousePosition = payload;
          this.trace('mousemove', payload, { source: 'poll' });
          this.emit('mousemove', payload);
        }
      } catch (error) {
        console.error('[SystemEvents] Error polling mouse position:', error);
      }
    }, pollRateMs);
  }

  startSystemKeyboardDetection() {
    if (GlobalKeyboardListener && GlobalKeyboardListenerAvailable) {
      try {
        this.globalKeyListener = new GlobalKeyboardListener({
          windows: {
            onError: (errorCode) => {
              console.error('[SystemEvents] Global key listener error:', errorCode);
            },
          },
          mac: {
            onError: (errorCode) => {
              console.error('[SystemEvents] Global key listener error:', errorCode);
            },
          },
        });
        
        this.globalKeyListener.addListener((e) => {
          try {
            const keyName = e.name || e.rawKey?.name || '';
            const keyCode = e.rawKey?.code || '';
            
            const mouseButtonNames = ['LEFT MOUSE', 'RIGHT MOUSE', 'MIDDLE MOUSE', 'MOUSE BUTTON', 'BUTTON'];
            const mouseButtonCodes = ['BUTTON_LEFT', 'BUTTON_RIGHT', 'BUTTON_MIDDLE', 'MOUSE'];
            
            const isMouseButton = 
              mouseButtonNames.some((name) => keyName.toUpperCase().includes(name)) ||
              mouseButtonCodes.some((code) => keyCode.toUpperCase().includes(code)) ||
              keyName.toUpperCase().includes('MOUSE') ||
              keyCode.toUpperCase().includes('MOUSE');
            
            if (isMouseButton) {
              return;
            }
            
            if (e.state === 'DOWN') {
              const keyEvent = {
                key: keyName || 'Unknown',
                code: keyCode || keyName || 'Unknown',
                timestamp: Date.now(),
              };
              this.trace('keydown', keyEvent, { source: 'node-global-key-listener' });
              this.emit('keydown', keyEvent);
            } else if (e.state === 'UP') {
              const keyEvent = {
                key: keyName || 'Unknown',
                code: keyCode || keyName || 'Unknown',
                timestamp: Date.now(),
              };
              this.trace('keyup', keyEvent, { source: 'node-global-key-listener' });
              this.emit('keyup', keyEvent);
            }
          } catch (error) {
            console.error('[SystemEvents] Error processing keyboard event:', error);
          }
        });

        console.log('[SystemEvents] System-wide keyboard detection enabled (node-global-key-listener)');
      } catch (error) {
        console.error('[SystemEvents] Error starting global key listener:', error);
        console.warn('[SystemEvents] Keyboard monitoring disabled - node-global-key-listener required for system-wide detection');
      }
    } else {
      console.warn('[SystemEvents] GlobalKeyboardListener not available. Install node-global-key-listener for system-wide keyboard detection.');
    }
  }

  stopSystemKeyboardDetection() {
    if (this.globalKeyListener) {
      try {
        if (typeof this.globalKeyListener.kill === 'function') {
          this.globalKeyListener.kill();
        } else if (typeof this.globalKeyListener.stop === 'function') {
          this.globalKeyListener.stop();
        } else if (typeof this.globalKeyListener.removeAllListeners === 'function') {
          this.globalKeyListener.removeAllListeners();
        }
      } catch (error) {
        console.error('[SystemEvents] Error stopping global key listener:', error);
      } finally {
        this.globalKeyListener = null;
      }
    }
  }

  startPowerShellMouseHook() {
    if (!isWindows) {
      return;
    }

    if (this.mouseHookProcess) {
      return;
    }

    const encodedScript = encodePowerShellScript(POWER_SHELL_MOUSE_SCRIPT);
    const args = [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-EncodedCommand',
      encodedScript,
    ];

    console.log('[SystemEvents] Starting PowerShell mouse hook process');
    const child = spawn('powershell.exe', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.mouseHookProcess = child;
    this.mouseHookBuffer = '';

    child.stdout.on('data', (chunk) => {
      this.handleMouseHookOutput(chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      // console.error('[SystemEvents][PowerShell] stderr:', chunk.toString());
    });

    child.on('exit', (code, signal) => {
      console.warn(`[SystemEvents] PowerShell mouse hook exited (code=${code}, signal=${signal})`);
      this.mouseHookProcess = null;
      if (this.isActive) {
        this.scheduleMouseHookRestart();
      }
    });

    child.on('error', (error) => {
      console.error('[SystemEvents] PowerShell mouse hook failed:', error);
      this.mouseHookProcess = null;
      this.scheduleMouseHookRestart();
    });
  }

  stopPowerShellMouseHook() {
    if (this.mouseHookRestartTimeout) {
      clearTimeout(this.mouseHookRestartTimeout);
      this.mouseHookRestartTimeout = null;
    }

    if (this.mouseHookProcess) {
      try {
        this.mouseHookProcess.kill();
      } catch (error) {
        console.error('[SystemEvents] Error stopping PowerShell mouse hook:', error);
      } finally {
        this.mouseHookProcess = null;
      }
    }
  }

  scheduleMouseHookRestart() {
    if (this.mouseHookRestartTimeout || !this.isActive) {
      return;
    }

    this.mouseHookRestartTimeout = setTimeout(() => {
      this.mouseHookRestartTimeout = null;
      if (this.isActive) {
        this.startPowerShellMouseHook();
      }
    }, 1000);
  }

  handleMouseHookOutput(chunk) {
    this.mouseHookBuffer += chunk;
    const lines = this.mouseHookBuffer.split(/\r?\n/);
    this.mouseHookBuffer = lines.pop() || '';

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return;
      }

      try {
        const data = JSON.parse(trimmed);
        this.handlePowerShellMouseEvent(data);
        } catch (error) {
        console.error('[SystemEvents] Failed to parse PowerShell mouse event:', error, 'Line:', trimmed);
      }
    });
  }

  handlePowerShellMouseEvent(event) {
    if (!event || !event.type) {
      return;
    }

    if (event.type === 'click') {
      // Convert button string to number: 'left' = 0, 'middle' = 1, 'right' = 2
      let button = 0;
      if (event.button === 'middle') {
        button = 1;
      } else if (event.button === 'right') {
        button = 2;
      }
      
      const payload = {
        x: event.x,
        y: event.y,
        button: button,
        timestamp: event.timestamp || Date.now(),
      };
      this.trace('click', payload, { source: 'powershell' });
      this.emit('click', payload);
    } else if (event.type === 'scroll') {
      const delta = event.delta || 0;
      const deltaY = delta; // PowerShell delta is already in the correct format
      const direction = event.direction || (delta > 0 ? 'up' : 'down');
      
      // Calculate velocity if we have previous scroll time
      let velocity = Math.abs(delta);
      const now = event.timestamp || Date.now();
      if (this.lastScrollTime !== null) {
        const timeDiff = now - this.lastScrollTime;
        if (timeDiff > 0) {
          velocity = Math.abs(deltaY / (timeDiff / 1000));
        }
      }
      
      const payload = {
        x: event.x,
        y: event.y,
        direction: direction,
        delta: deltaY,
        deltaY: deltaY,
        deltaX: 0,
        velocity: velocity,
        timestamp: now,
      };
      this.trace('scroll', payload, { source: 'powershell' });
      this.emit('scroll', payload);
    }
  }

  

  emit(eventType, data) {
    if (this.eventCallbacks[eventType]) {
      const callbackCount = this.eventCallbacks[eventType].length;

      if (
        (eventType === 'click' || eventType === 'scroll') &&
        (!this[`_${eventType}EmitCount`] || this[`_${eventType}EmitCount`] < 3)
      ) {
        console.log(`[SystemEvents] Emitting ${eventType} to ${callbackCount} callback(s):`, data);
        if (!this[`_${eventType}EmitCount`]) this[`_${eventType}EmitCount`] = 0;
        this[`_${eventType}EmitCount`]++;
      }
      
      this.eventCallbacks[eventType].forEach((callback, index) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[SystemEvents] ✗ Error in ${eventType} callback ${index}:`, error);
        }
      });
    } else {
      console.warn(`[SystemEvents] ⚠ No callbacks registered for event type: ${eventType} - events will be lost!`);
    }
  }

  on(eventType, callback) {
    if (this.eventCallbacks[eventType]) {
      this.eventCallbacks[eventType].push(callback);
    }
  }

  off(eventType, callback) {
    if (this.eventCallbacks[eventType]) {
      const index = this.eventCallbacks[eventType].indexOf(callback);
      if (index > -1) {
        this.eventCallbacks[eventType].splice(index, 1);
      }
    }
  }

  setTracing(enabled) {
    this.traceEnabled = !!enabled;
    console.log(`[SystemEvents] Trace ${this.traceEnabled ? 'enabled' : 'disabled'}`);
  }

  trace(eventType, payload, context = {}) {
    if (!this.traceEnabled) {
      return;
    }

    const countKey = eventType;
    this.traceCounters[countKey] = (this.traceCounters[countKey] || 0) + 1;
    const count = this.traceCounters[countKey];

    const shouldLog = count <= 25 || count % 100 === 0;
    if (!shouldLog) {
      return;
    }

    console.log(`[SystemEvents][TRACE] ${eventType} (#${count})`, {
      payload,
      context,
    });
  }

  getMousePosition() {
    if (this.lastMousePosition) {
      return { ...this.lastMousePosition };
    }

    try {
      const point = screen.getCursorScreenPoint();
      return {
        x: point.x,
        y: point.y,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[SystemEvents] Error getting mouse position:', error);
      return null;
    }
  }
}

module.exports = SystemEventCapture;

