# System Events Debugging Guide

## Current Implementation Status

### What SHOULD Work:
1. **Keyboard Events**: Using `node-global-key-listener` - should work system-wide
2. **Mouse Clicks**: Using PowerShell + Windows API `GetAsyncKeyState` - should work system-wide
3. **Mouse Movement**: Using Electron's `screen.getCursorScreenPoint()` - works system-wide
4. **Scroll Detection**: Using PowerShell polling cursor position - LIMITED

### Known Limitations & Why They Exist:

#### 1. **Mouse Click Detection Limitations**

**Current Approach**: PowerShell script polling `GetAsyncKeyState` every 5ms

**Why It Might Not Work**:
- PowerShell execution policy restrictions
- Process might not start correctly
- Output buffering issues
- Events might be emitted but not reaching renderer

**What's Actually Possible**:
- ✅ System-wide click detection IS possible on Windows using low-level hooks
- ✅ `GetAsyncKeyState` works system-wide without admin rights
- ❌ The current polling approach has timing issues

**Better Solution Would Require**:
- Native Node.js addon with Windows API hooks (SetWindowsHookEx)
- Or a more robust PowerShell script with better error handling

#### 2. **Scroll Detection Limitations**

**Current Approach**: Polling cursor Y position every 8ms, detecting rapid vertical movement

**Why It's Fundamentally Limited**:
- ❌ **Cannot detect actual mouse wheel events** - only cursor movement
- ❌ **False positives**: Any rapid vertical mouse movement looks like scrolling
- ❌ **False negatives**: Slow scrolling or trackpad gestures might not be detected
- ❌ **Doesn't work for touchpad gestures** - only detects cursor movement

**What's Actually Possible**:
- ✅ True mouse wheel detection requires low-level Windows hooks (SetWindowsHookEx)
- ✅ Would need native Node.js addon or more complex PowerShell with Windows Forms
- ❌ The current position-based approach is a workaround, not a real solution

**Better Solution Would Require**:
- Native Node.js addon using `SetWindowsHookEx` with `WH_MOUSE_LL` hook
- Or using a library like `iohook` or `robotjs` (but these have their own limitations)

#### 3. **Why Native Solutions Are Needed**

**PowerShell Limitations**:
- Can't easily create persistent low-level hooks
- Output buffering can cause delays
- Process management is complex
- Error handling is limited

**What Would Actually Work**:
1. **Native Node.js Addon** using:
   - `SetWindowsHookEx` for mouse wheel hooks
   - `GetAsyncKeyState` for mouse buttons (current approach is OK)
   - Direct Windows API calls

2. **Existing Libraries** (but with trade-offs):
   - `iohook` - system-wide hooks, but requires native compilation
   - `robotjs` - can detect but also can inject events (security concern)
   - `node-global-key-listener` - works for keyboard (already using)

## Debugging Steps

1. **Check if PowerShell scripts are running**:
   - Look for process PIDs in console logs
   - Check if stdout is being received

2. **Check if events are emitted**:
   - Look for `[SystemEvents] Emitting click event` logs
   - Check callback count

3. **Check if events reach main process**:
   - Look for `[Main] Received click event` logs

4. **Check if events reach renderer**:
   - Open DevTools in Electron window
   - Check console for `[COGA]` logs
   - Verify `electron.systemEvents.on()` is being called

## What's Impossible Without Native Code

1. **True mouse wheel detection** - Requires low-level hooks that PowerShell can't easily provide
2. **Touchpad gesture detection** - Requires specialized APIs
3. **High-performance event capture** - Polling has inherent delays

## Recommended Solution Path

1. **Short-term**: Fix PowerShell script issues (debugging added)
2. **Medium-term**: Use `iohook` library for proper system-wide hooks
3. **Long-term**: Build native Node.js addon for full control

