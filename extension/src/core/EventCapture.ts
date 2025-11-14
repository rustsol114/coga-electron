/**
 * EventCapture.ts
 * Captures and tracks mouse and keyboard behavioral metrics
 */

import { METRIC_WINDOW_MS } from '../config';
import type {
  ClickEvent,
  KeyPress,
  VelocityData,
  PauseDuration,
  Position,
  BehavioralMetrics,
} from '../types';

type NumericSample = {
  value: number;
  timestamp: number;
};

interface MouseData {
  positions: Position[];
  pathPositions: Position[];
  clicks: ClickEvent[];
  velocity: NumericSample[];
  acceleration: NumericSample[];
  jerk: NumericSample[];
  directionAngles: NumericSample[];
  directionChanges: number[];
  pauses: PauseDuration[];
  pathEfficiency: NumericSample[];
  lastPosition: Position;
  lastVelocity: number;
  lastAcceleration: number;
  lastDirection: number | null;
  pauseStart: number | null;
  rageClickDetected?: number;
  zoneTracking: Map<number, number>; // Track which zone (0-8) and how many times
  multiClickTimestamps: number[];
  lastMultiClickTimestamp: number | null;
}

interface KeyStats {
  key: string;
  count: number;
  frequency: number; // presses per minute
}

interface KeyboardData {
  keyPresses: KeyPress[];
  keyReleases: KeyPress[];
  backspaces: number;
  backspaceTimestamps: number[];
  pauses: PauseDuration[];
  interKeyIntervals: NumericSample[];
  holdDurations: NumericSample[];
  rhythmSamples: NumericSample[];
  lastKeyTime: number;
  keyStats: Map<string, number>; // Track count per key
  keyDownMap: Map<string, number>;
  errorBurstTimestamps: number[];
}

interface ScrollData {
  velocity: NumericSample[];
  acceleration: NumericSample[];
  directionChanges: number[];
  burstTimestamps: number[];
  stopDurations: PauseDuration[];
  lastScroll: { y: number; timestamp: number };
  lastVelocity: number;
  lastDirection: number | null;
  lastMovementTimestamp: number;
}

interface EventListener {
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

class EventCapture {
  private static readonly METRIC_WINDOW_MS = METRIC_WINDOW_MS;
  private static readonly PATH_WINDOW_MS = 5 * 1000; // 5 seconds
  private static readonly BURST_WINDOW_MS = 2 * 1000; // 2 seconds
  private static readonly SAMPLE_LIMIT = 200;

  private mouseData: MouseData;
  private keyboardData: KeyboardData;
  private scrollData: ScrollData;
  private isActive: boolean;
  private listeners: EventListener[];
  private systemEventCleanups: (() => void)[];
  private useSystemEvents: boolean;

  constructor() {
    this.mouseData = {
      positions: [],
      pathPositions: [],
      clicks: [],
      velocity: [],
      acceleration: [],
      jerk: [],
      directionAngles: [],
      directionChanges: [],
      pauses: [],
      pathEfficiency: [],
      lastPosition: { x: 0, y: 0, timestamp: Date.now() },
      lastVelocity: 0,
      lastAcceleration: 0,
      lastDirection: null,
      pauseStart: null,
      zoneTracking: new Map(),
      multiClickTimestamps: [],
      lastMultiClickTimestamp: null,
    };

    this.keyboardData = {
      keyPresses: [],
      keyReleases: [],
      backspaces: 0,
      backspaceTimestamps: [],
      pauses: [],
      interKeyIntervals: [],
      holdDurations: [],
      rhythmSamples: [],
      lastKeyTime: Date.now(),
      keyStats: new Map(),
      keyDownMap: new Map(),
      errorBurstTimestamps: [],
    };

    this.scrollData = {
      velocity: [],
      acceleration: [],
      directionChanges: [],
      burstTimestamps: [],
      stopDurations: [],
      lastScroll: { y: 0, timestamp: Date.now() },
      lastVelocity: 0,
      lastDirection: null,
      lastMovementTimestamp: Date.now(),
    };

    this.isActive = false;
    this.listeners = [];
    this.systemEventCleanups = [];
    
    // Check if we're in Electron and system events are available
    this.useSystemEvents = 
      typeof window !== 'undefined' &&
      (window as any).electron?.systemEvents !== undefined;
  }

  /**
   * Start capturing events
   */
  async start(): Promise<void> {
    if (this.isActive) return;

    this.isActive = true;
    await this.attachListeners();
  }

  /**
   * Stop capturing events
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.detachListeners();
  }

  /**
   * Attach event listeners to the document
   */
  private async attachListeners(): Promise<void> {
    if (this.useSystemEvents) {
      await this.attachSystemListeners();
    } else {
      this.attachDOMListeners();
    }
  }

  /**
   * Attach DOM event listeners (browser mode)
   */
  private attachDOMListeners(): void {
    const handleMouseMove = this.handleMouseMove.bind(this);
    const handleMouseClick = this.handleMouseClick.bind(this);
    const handleKeyDown = this.handleKeyDown.bind(this);
    const handleKeyUp = this.handleKeyUp.bind(this);
    const handleScroll = this.handleScroll.bind(this);
    const handleWheel = (e: WheelEvent) => {
      this.handleWheelEvent(e);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleMouseClick);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    document.addEventListener('wheel', handleWheel, { passive: true, capture: true });

    this.listeners = [
      { event: 'mousemove', handler: handleMouseMove as unknown as EventListenerOrEventListenerObject },
      { event: 'click', handler: handleMouseClick as unknown as EventListenerOrEventListenerObject },
      { event: 'keydown', handler: handleKeyDown as unknown as EventListenerOrEventListenerObject },
      { event: 'keyup', handler: handleKeyUp as unknown as EventListenerOrEventListenerObject },
      { event: 'scroll', handler: handleScroll as unknown as EventListenerOrEventListenerObject, options: true },
      { event: 'scroll', handler: handleScroll as unknown as EventListenerOrEventListenerObject, options: true },
      { event: 'wheel', handler: handleWheel as unknown as EventListenerOrEventListenerObject, options: { passive: true, capture: true } },
    ];
  }

  /**
   * Attach system-level event listeners (Electron mode)
   */
  private async attachSystemListeners(): Promise<void> {
    try {
      const electron = (window as any).electron;
      if (!electron?.systemEvents) {
        console.warn('[COGA] System events not available, falling back to DOM events');
        this.attachDOMListeners();
        return;
      }

      // Start system event monitoring
      const result = await electron.systemEvents.start();
      if (!result.success) {
        console.warn('[COGA] Failed to start system events:', result.error);
        this.attachDOMListeners();
        return;
      }

      console.log('[COGA] System-level monitoring enabled');

      // Listen to system mouse move events
      const mouseMoveCleanup = electron.systemEvents.on('mousemove', (data: any) => {
        // Convert system event to DOM-like event format
        const syntheticEvent = {
          clientX: data.x,
          clientY: data.y,
          timestamp: data.timestamp,
        } as any;
        this.handleMouseMove(syntheticEvent);
      });
      this.systemEventCleanups.push(mouseMoveCleanup);

      // Listen to system keyboard events
      const keyDownCleanup = electron.systemEvents.on('keydown', (data: any) => {
        // Validate that this is actually a keyboard event, not a mouse event
        const keyName = (data.key || '').toUpperCase();
        const keyCode = (data.code || '').toUpperCase();
        
        // Filter out mouse button events that might have been incorrectly routed
        const isMouseButton = 
          keyName.includes('MOUSE') ||
          keyCode.includes('MOUSE') ||
          keyName.includes('BUTTON') ||
          keyCode.includes('BUTTON') ||
          keyName === 'LEFT' || keyName === 'RIGHT' || keyName === 'MIDDLE';
        
        if (isMouseButton) {
          console.warn('[COGA] Ignoring mouse button event incorrectly routed to keyboard handler:', data);
          return;
        }
        
        const syntheticEvent = {
          key: data.key,
          code: data.code || data.key,
          timestamp: data.timestamp || Date.now(),
        };
        this.handleKeyDown(syntheticEvent);
      });
      this.systemEventCleanups.push(keyDownCleanup);

      const keyUpCleanup = electron.systemEvents.on('keyup', (data: any) => {
        // Validate that this is actually a keyboard event, not a mouse event
        const keyName = (data.key || '').toUpperCase();
        const keyCode = (data.code || '').toUpperCase();
        
        // Filter out mouse button events that might have been incorrectly routed
        const isMouseButton = 
          keyName.includes('MOUSE') ||
          keyCode.includes('MOUSE') ||
          keyName.includes('BUTTON') ||
          keyCode.includes('BUTTON') ||
          keyName === 'LEFT' || keyName === 'RIGHT' || keyName === 'MIDDLE';
        
        if (isMouseButton) {
          console.warn('[COGA] Ignoring mouse button event incorrectly routed to keyboard handler:', data);
          return;
        }
        
        const syntheticEvent = {
          key: data.key,
          code: data.code || data.key,
          timestamp: data.timestamp || Date.now(),
        };
        this.handleKeyUp(syntheticEvent);
      });
      this.systemEventCleanups.push(keyUpCleanup);

      // Listen to system click events (system-wide)
      const clickCleanup = electron.systemEvents.on('click', (data: any) => {
        console.log('[COGA] Received system click event in renderer:', data);
        // Convert system click event to DOM-like format
        const syntheticEvent = {
          clientX: data.x,
          clientY: data.y,
          button: data.button || 0,
          timestamp: data.timestamp || Date.now(),
        } as any;
        console.log('[COGA] Calling handleMouseClick with:', syntheticEvent);
        this.handleMouseClick(syntheticEvent);
      });
      this.systemEventCleanups.push(clickCleanup);
      console.log('[COGA] System click listener registered');

      // Listen to system scroll events (system-wide)
      const scrollCleanup = electron.systemEvents.on('scroll', (data: any) => {
        console.log('[COGA] Received system scroll event in renderer:', data);
        // Convert system scroll event to wheel-like format
        const syntheticWheelEvent = {
          deltaY: data.deltaY || (data.direction === 'down' ? 100 : -100),
          deltaX: data.deltaX || 0,
          deltaZ: 0,
          timestamp: data.timestamp || Date.now(),
        } as any;
        console.log('[COGA] Calling handleWheelEvent with:', syntheticWheelEvent);
        this.handleWheelEvent(syntheticWheelEvent);
      });
      this.systemEventCleanups.push(scrollCleanup);
      console.log('[COGA] System scroll listener registered');

      // Also attach DOM scroll listeners for window-specific scroll detection
      // This provides better coverage for scrolls within the Electron window
      const handleScroll = this.handleScroll.bind(this);
      const handleWheel = (e: WheelEvent) => {
        // Handle wheel events directly for better scroll detection
        this.handleWheelEvent(e);
      };
      
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
      document.addEventListener('wheel', handleWheel, { passive: true, capture: true });

      this.listeners = [
        { event: 'scroll', handler: handleScroll as unknown as EventListenerOrEventListenerObject, options: true },
        { event: 'scroll', handler: handleScroll as unknown as EventListenerOrEventListenerObject, options: true },
        { event: 'wheel', handler: handleWheel as unknown as EventListenerOrEventListenerObject, options: { passive: true, capture: true } },
      ];
    } catch (error) {
      console.error('[COGA] Error attaching system listeners:', error);
      this.attachDOMListeners();
    }
  }

  /**
   * Detach all event listeners
   */
  private detachListeners(): void {
    // Remove DOM listeners
    this.listeners.forEach(({ event, handler, options }) => {
      document.removeEventListener(event, handler, options);
    });
    this.listeners = [];

    // Cleanup system event listeners
    this.systemEventCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('[COGA] Error cleaning up system event listener:', error);
      }
    });
    this.systemEventCleanups = [];

    // Stop system event monitoring if active
    if (this.useSystemEvents && typeof window !== 'undefined') {
      const electron = (window as any).electron;
      if (electron?.systemEvents) {
        electron.systemEvents.stop().catch((error: any) => {
          console.error('[COGA] Error stopping system events:', error);
        });
      }
    }
  }

  /**
   * Handle mouse movement events
   */
  private handleMouseMove(event: MouseEvent | { clientX: number; clientY: number; timestamp?: number }): void {
    try {
      const now = event.timestamp || Date.now();
      const { clientX: x, clientY: y } = event;

      // Calculate velocity
      const dx = x - this.mouseData.lastPosition.x;
      const dy = y - this.mouseData.lastPosition.y;
      const dt = now - this.mouseData.lastPosition.timestamp;

      if (dt > 0) {
        const dtSeconds = dt / 1000;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / Math.max(dtSeconds, 0.001); // px/s
        const acceleration =
          dtSeconds > 0
            ? (velocity - this.mouseData.lastVelocity) / dtSeconds
            : 0;
        const jerk =
          dtSeconds > 0
            ? (acceleration - this.mouseData.lastAcceleration) /
              dtSeconds
            : 0;

        this.pushSample(this.mouseData.velocity, velocity, now, 200);
        this.pushSample(this.mouseData.acceleration, acceleration, now, 200);
        this.pushSample(this.mouseData.jerk, jerk, now, 200);

        this.mouseData.lastVelocity = velocity;
        this.mouseData.lastAcceleration = acceleration;

        // Direction change detection
        const angle = Math.atan2(dy, dx);
        this.mouseData.directionAngles.push({ value: angle, timestamp: now });
        if (this.mouseData.directionAngles.length > 200) {
          this.mouseData.directionAngles.shift();
        }

        if (this.mouseData.lastDirection !== null) {
          const angleDiff = this.normalizeAngle(
            angle - this.mouseData.lastDirection
          );
          if (Math.abs(angleDiff) > Math.PI / 4) {
            this.mouseData.directionChanges.push(now);
            this.trimTimestamps(
              this.mouseData.directionChanges,
              now,
              EventCapture.METRIC_WINDOW_MS
            );
          }
        }
        this.mouseData.lastDirection = angle;

        // Pause detection (velocity below threshold)
        if (velocity < 20) {
          if (this.mouseData.pauseStart === null) {
            this.mouseData.pauseStart = now;
          }
        } else if (this.mouseData.pauseStart !== null) {
          const pauseDurationSeconds =
            (now - this.mouseData.pauseStart) / 1000;
          if (pauseDurationSeconds >= 0.1) {
            this.mouseData.pauses.push({
              duration: pauseDurationSeconds,
              timestamp: now,
            });
            if (this.mouseData.pauses.length > 100) {
              this.mouseData.pauses.shift();
            }
          }
          this.mouseData.pauseStart = null;
        }

        // Track path efficiency over rolling window
        this.mouseData.pathPositions.push({ x, y, timestamp: now });
        this.trimSamplesByTime(this.mouseData.pathPositions, now, EventCapture.PATH_WINDOW_MS);
        const pathEfficiency = this.calculatePathEfficiency(
          this.mouseData.pathPositions
        );
        this.pushSample(
          this.mouseData.pathEfficiency,
          pathEfficiency,
          now,
          200
        );
      }

      this.mouseData.lastPosition = { x, y, timestamp: now };
      
      // Track zone (9 zones: 3x3 grid)
      const zone = this.getMouseZone(x, y);
      const currentCount = this.mouseData.zoneTracking.get(zone) || 0;
      this.mouseData.zoneTracking.set(zone, currentCount + 1);

      // Track recent positions (for heatmap or future use)
      this.mouseData.positions.push({ x, y, timestamp: now });
      if (this.mouseData.positions.length > 500) {
        this.mouseData.positions.shift();
      }
    } catch (error) {
      console.error('[COGA] Error in handleMouseMove:', error);
    }
  }

  /**
   * Get mouse zone (0-8) from coordinates
   * 0: top-left, 1: top-center, 2: top-right
   * 3: middle-left, 4: middle-center, 5: middle-right
   * 6: bottom-left, 7: bottom-center, 8: bottom-right
   */
  private getMouseZone(x: number, y: number): number {
    try {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const thirdWidth = viewportWidth / 3;
      const thirdHeight = viewportHeight / 3;
      
      const col = Math.min(2, Math.floor(x / thirdWidth));
      const row = Math.min(2, Math.floor(y / thirdHeight));
      
      return row * 3 + col;
    } catch (error) {
      console.error('[COGA] Error getting mouse zone:', error);
      return 4; // Default to center
    }
  }

  /**
   * Handle mouse click events (works with both DOM and system events)
   */
  private handleMouseClick(event: MouseEvent | { clientX: number; clientY: number; button?: number; timestamp?: number }): void {
    try {
      const now = (event as any).timestamp || Date.now();
      this.mouseData.clicks.push({
        x: event.clientX,
        y: event.clientY,
        timestamp: now,
      });

      // Keep only last 50 clicks
      if (this.mouseData.clicks.length > 50) {
        this.mouseData.clicks.shift();
      }

      this.mouseData.clicks = this.mouseData.clicks.filter(
        (click) => now - click.timestamp < EventCapture.METRIC_WINDOW_MS
      );

      // Detect rage clicks (3+ clicks within 500ms in same area)
      this.detectRageClicks();
      this.trackMultiClicks(now);
    } catch (error) {
      console.error('[COGA] Error in handleMouseClick:', error);
    }
  }

  /**
   * Detect rage clicking patterns
   */
  private detectRageClicks(): void {
    try {
      const now = Date.now();
      const recentClicks = this.mouseData.clicks.filter(
        (click) => now - click.timestamp < 500
      );

      if (recentClicks.length >= 3) {
        // Check if clicks are in similar area (within 50px)
        const firstClick = recentClicks[0];
        const isRageClick = recentClicks.every((click) => {
          const dx = click.x - firstClick.x;
          const dy = click.y - firstClick.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < 50;
        });

        if (isRageClick) {
          this.mouseData.rageClickDetected = now;
        }
      }
    } catch (error) {
      console.error('[COGA] Error in detectRageClicks:', error);
    }
  }

  /**
   * Track double/triple click clusters
   */
  private trackMultiClicks(now: number): void {
    try {
      if (!this.mouseData.clicks.length) {
        return;
      }

      const recentClicks = this.mouseData.clicks.filter(
        (click) => now - click.timestamp < 400
      );

      if (recentClicks.length < 2) {
        return;
      }

      const firstClick = recentClicks[0];
      const isCluster = recentClicks.every((click) => {
        const dx = click.x - firstClick.x;
        const dy = click.y - firstClick.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < 50;
      });

      if (
        isCluster &&
        (this.mouseData.lastMultiClickTimestamp === null ||
          now - this.mouseData.lastMultiClickTimestamp > 400)
      ) {
        this.mouseData.multiClickTimestamps.push(now);
        if (this.mouseData.multiClickTimestamps.length > 100) {
          this.mouseData.multiClickTimestamps.shift();
        }
        this.mouseData.lastMultiClickTimestamp = now;
      }
    } catch (error) {
      console.error('[COGA] Error tracking multi clicks:', error);
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent | { key: string; code: string; timestamp?: number; target?: HTMLElement }): void {
    try {
      const now = event.timestamp || Date.now();

      // Additional validation: ensure this is not a mouse event
      const keyName = (event.key || '').toUpperCase();
      const keyCode = (event.code || '').toUpperCase();
      if (keyName.includes('MOUSE') || keyCode.includes('MOUSE') || 
          keyName.includes('BUTTON') || keyCode.includes('BUTTON')) {
        console.warn('[COGA] Rejecting mouse event in handleKeyDown:', event);
        return;
      }

      // Skip if in password field or sensitive input (only for DOM events)
      if ('target' in event && event.target && this.isPasswordField(event.target as HTMLElement)) {
        return;
      }

      // Track backspace frequency
      if (event.key === 'Backspace') {
        this.keyboardData.backspaces++;
        this.keyboardData.backspaceTimestamps.push(now);
        this.trimTimestamps(
          this.keyboardData.backspaceTimestamps,
          now,
          EventCapture.BURST_WINDOW_MS
        );

        if (this.keyboardData.backspaceTimestamps.length >= 3) {
          // Track error bursts (3 backspaces within burst window)
          this.keyboardData.errorBurstTimestamps.push(now);
          this.trimTimestamps(
            this.keyboardData.errorBurstTimestamps,
            now,
            EventCapture.METRIC_WINDOW_MS
          );
        }
      }

      // Calculate pause duration
      const pauseDuration = now - this.keyboardData.lastKeyTime;
      if (pauseDuration > 50 && pauseDuration < 10000) {
        this.keyboardData.pauses.push({
          duration: pauseDuration / 1000,
          timestamp: now,
        });

        // Keep only last 50 pauses
        if (this.keyboardData.pauses.length > 50) {
          this.keyboardData.pauses.shift();
        }

        // Inter-key interval sample (seconds)
        this.keyboardData.interKeyIntervals.push({
          value: pauseDuration / 1000,
          timestamp: now,
        });
        this.trimSamples(this.keyboardData.interKeyIntervals, 200);
        this.pushSample(
          this.keyboardData.rhythmSamples,
          pauseDuration / 1000,
          now,
          200
        );
      }

      this.keyboardData.keyPresses.push({
        key: event.key,
        timestamp: now,
      });

      // Track key statistics
      const keyName = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const currentCount = this.keyboardData.keyStats.get(keyName) || 0;
      this.keyboardData.keyStats.set(keyName, currentCount + 1);

      // Track hold duration start
      this.keyboardData.keyDownMap.set(event.code, now);

      // Keep only last 100 key presses
      if (this.keyboardData.keyPresses.length > 100) {
        this.keyboardData.keyPresses.shift();
      }

      this.keyboardData.lastKeyTime = now;

      if (event.key !== 'Backspace') {
        this.keyboardData.backspaceTimestamps = this.keyboardData.backspaceTimestamps.filter(
          (timestamp) => now - timestamp < EventCapture.METRIC_WINDOW_MS
        );
      }
    } catch (error) {
      console.error('[COGA] Error in handleKeyDown:', error);
    }
  }

  /**
   * Handle keyup events for hold duration tracking
   */
  private handleKeyUp(event: KeyboardEvent | { key: string; code: string; timestamp?: number; target?: HTMLElement }): void {
    try {
      const now = event.timestamp || Date.now();

      // Additional validation: ensure this is not a mouse event
      const keyName = (event.key || '').toUpperCase();
      const keyCode = (event.code || '').toUpperCase();
      if (keyName.includes('MOUSE') || keyCode.includes('MOUSE') || 
          keyName.includes('BUTTON') || keyCode.includes('BUTTON')) {
        console.warn('[COGA] Rejecting mouse event in handleKeyUp:', event);
        return;
      }

      // Skip if in password field or sensitive input (only for DOM events)
      if ('target' in event && event.target && this.isPasswordField(event.target as HTMLElement)) {
        return;
      }

      const keyDownTime = this.keyboardData.keyDownMap.get(event.code);
      if (typeof keyDownTime === 'number') {
        const holdDurationSeconds = Math.max(
          0,
          (now - keyDownTime) / 1000
        );
        this.keyboardData.holdDurations.push({
          value: holdDurationSeconds,
          timestamp: now,
        });
        this.trimSamples(this.keyboardData.holdDurations, 200);
        this.keyboardData.keyDownMap.delete(event.code);
      }

      this.keyboardData.keyReleases.push({
        key: event.key,
        timestamp: now,
      });

      if (this.keyboardData.keyReleases.length > 100) {
        this.keyboardData.keyReleases.shift();
      }
    } catch (error) {
      console.error('[COGA] Error in handleKeyUp:', error);
    }
  }

  /**
   * Handle wheel events for scroll detection
   */
  private handleWheelEvent(event: WheelEvent | { deltaY: number; deltaX?: number; deltaZ?: number; timestamp?: number }): void {
    try {
      const now = (event as any).timestamp || Date.now();
      const deltaY = Math.abs((event as any).deltaY || 0);
      
      if (deltaY > 0) {
        const dt = now - this.scrollData.lastScroll.timestamp;
        const dtSeconds = dt / 1000;
        
        if (dt > 0) {
          const velocity = deltaY / Math.max(dtSeconds, 0.001);
          const acceleration =
            dtSeconds > 0
              ? (velocity - this.scrollData.lastVelocity) / dtSeconds
              : 0;

          this.pushSample(this.scrollData.velocity, velocity, now, 200);
          this.pushSample(this.scrollData.acceleration, acceleration, now, 200);
          this.scrollData.lastVelocity = velocity;

          const direction = Math.sign(event.deltaY);
          if (
            this.scrollData.lastDirection !== null &&
            direction !== 0 &&
            direction !== this.scrollData.lastDirection
          ) {
            this.scrollData.directionChanges.push(now);
            this.trimTimestamps(
              this.scrollData.directionChanges,
              now,
              EventCapture.METRIC_WINDOW_MS
            );
          }
          if (direction !== 0) {
            this.scrollData.lastDirection = direction;
          }

          if (velocity > 400) {
            this.scrollData.burstTimestamps.push(now);
            this.trimTimestamps(
              this.scrollData.burstTimestamps,
              now,
              EventCapture.METRIC_WINDOW_MS
            );
          }

          this.scrollData.lastMovementTimestamp = now;
        }
      }

      // Update last scroll position based on actual scroll position
      const currentScrollY = window.scrollY || window.pageYOffset;
      this.scrollData.lastScroll = {
        y: currentScrollY,
        timestamp: now,
      };
    } catch (error) {
      console.error('[COGA] Error in handleWheelEvent:', error);
    }
  }

  /**
   * Handle scroll events (works with both DOM scroll and wheel events)
   */
  private handleScroll(event: Event): void {
    try {
      const now = Date.now();
      // Get scroll position from window or event target
      let scrollY = window.scrollY || window.pageYOffset;
      
      // Try to get scroll position from the scrolled element
      if (event.target && event.target instanceof Element) {
        const target = event.target as HTMLElement;
        if (target.scrollTop !== undefined) {
          scrollY = target.scrollTop;
        }
      }

      const dy = scrollY - this.scrollData.lastScroll.y;
      const dt = now - this.scrollData.lastScroll.timestamp;

      if (dt > 0 && Math.abs(dy) > 0) {
        const dtSeconds = dt / 1000;
        const velocity = Math.abs(dy) / Math.max(dtSeconds, 0.001);
        const acceleration =
          dtSeconds > 0
            ? (velocity - this.scrollData.lastVelocity) / dtSeconds
            : 0;

        this.pushSample(this.scrollData.velocity, velocity, now, 200);
        this.pushSample(this.scrollData.acceleration, acceleration, now, 200);
        this.scrollData.lastVelocity = velocity;

        const direction = Math.sign(dy);
        if (
          this.scrollData.lastDirection !== null &&
          direction !== 0 &&
          direction !== this.scrollData.lastDirection
        ) {
          this.scrollData.directionChanges.push(now);
          this.trimTimestamps(
            this.scrollData.directionChanges,
            now,
            EventCapture.METRIC_WINDOW_MS
          );
        }
        if (direction !== 0) {
          this.scrollData.lastDirection = direction;
        }

        if (velocity > 400) {
          this.scrollData.burstTimestamps.push(now);
          this.trimTimestamps(
            this.scrollData.burstTimestamps,
            now,
            EventCapture.METRIC_WINDOW_MS
          );
        }

        this.scrollData.lastMovementTimestamp = now;
        
        // Update last scroll position
        this.scrollData.lastScroll = {
          y: scrollY,
          timestamp: now,
        };
      } else {
        // Capture scroll-to-stop duration when movement slows down
        if (
          this.scrollData.lastVelocity > 0 &&
          now - this.scrollData.lastMovementTimestamp <
            EventCapture.METRIC_WINDOW_MS
        ) {
          const stopDurationSeconds =
            (now - this.scrollData.lastMovementTimestamp) / 1000;
          this.scrollData.stopDurations.push({
            duration: stopDurationSeconds,
            timestamp: now,
          });
          this.trimPauseSamples(this.scrollData.stopDurations, 100);
        }

        this.scrollData.lastVelocity = 0;
      }

      this.scrollData.lastScroll = { y: scrollY, timestamp: now };
    } catch (error) {
      console.error('[COGA] Error in handleScroll:', error);
    }
  }

  /**
   * Check if input is a password field
   */
  private isPasswordField(element: HTMLElement | null): boolean {
    if (!element || !('tagName' in element)) return false;

    const input = element as HTMLInputElement;
    return (
      input.type === 'password' ||
      input.autocomplete === 'current-password' ||
      input.autocomplete === 'new-password'
    );
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): BehavioralMetrics {
    try {
      const now = Date.now();
      const windowMs = EventCapture.METRIC_WINDOW_MS;
      const windowSeconds = windowMs / 1000;
      const windowMinutes = windowSeconds / 60;

      // Mouse metrics
      const recentMouseVelocity = this.filterSamples(this.mouseData.velocity, now);
      const recentMouseAcceleration = this.filterSamples(this.mouseData.acceleration, now);
      const recentMouseJerk = this.filterSamples(this.mouseData.jerk, now);
      const recentPathEfficiency = this.filterSamples(this.mouseData.pathEfficiency, now);
      const recentPauses = this.mouseData.pauses.filter((pause) => now - pause.timestamp < windowMs);
      const recentClicks = this.mouseData.clicks.filter((click) => now - click.timestamp < windowMs);
      const recentMultiClicks = this.mouseData.multiClickTimestamps.filter(
        (timestamp) => now - timestamp < windowMs
      );

      const averageVelocity = this.calculateAverage(
        recentMouseVelocity.map((sample) => sample.value)
      );
      const averageAcceleration = this.calculateAverage(
        recentMouseAcceleration.map((sample) => sample.value)
      );
      const averageJitter = this.calculateAverage(
        recentMouseJerk.map((sample) => Math.abs(sample.value))
      );
      const averagePathEfficiency = this.calculateAverage(
        recentPathEfficiency.map((sample) => sample.value)
      );
      const totalPauseSeconds = recentPauses.reduce(
        (sum, pause) => sum + pause.duration,
        0
      );
      const pauseRatio = Math.min(
        1,
        totalPauseSeconds / Math.max(windowSeconds, 1)
      );

      const clickFrequencyPerMin =
        windowMinutes > 0 ? recentClicks.length / windowMinutes : 0;
      const multiClickRatePerMin =
        windowMinutes > 0 ? recentMultiClicks.length / windowMinutes : 0;

      const mouseMetrics = {
        movementVelocity: averageVelocity,
        movementAcceleration: averageAcceleration,
        mouseJitter: averageJitter,
        clickFrequencyPerMin,
        multiClickRatePerMin,
        pathEfficiency: averagePathEfficiency,
        pauseRatio,
        scrollVelocity: 0,
        rageClickDetected:
          !!this.mouseData.rageClickDetected &&
          now - this.mouseData.rageClickDetected < 5000,
      };

      // Scroll contribution (velocity only for weighting)
      const recentScrollVelocity = this.filterSamples(this.scrollData.velocity, now);
      mouseMetrics.scrollVelocity = this.calculateAverage(
        recentScrollVelocity.map((sample) => sample.value)
      );

      // Keyboard metrics
      const recentKeyPresses = this.keyboardData.keyPresses.filter(
        (press) => now - press.timestamp < windowMs
      );
      const typingSpeedPerMin =
        windowMinutes > 0 ? recentKeyPresses.length / windowMinutes : 0;
      const backspacesRecent = this.keyboardData.backspaceTimestamps.filter(
        (timestamp) => now - timestamp < windowMs
      );
      const typingErrorRate =
        recentKeyPresses.length > 0
          ? (backspacesRecent.length / recentKeyPresses.length) * 10
          : 0;
      const recentKeyboardPauses = this.keyboardData.pauses.filter(
        (pause) => now - pause.timestamp < windowMs
      );
      const avgPauseDuration = this.calculateAverage(
        recentKeyboardPauses.map((pause) => pause.duration)
      );
      const pauseRegularity = this.calculateCoefficientOfVariation(
        recentKeyboardPauses.map((pause) => pause.duration)
      );

      const keyboardMetrics = {
        typingErrorRate,
        typingSpeedPerMin,
        pauseRegularity,
        avgPauseDuration,
      };

      const scrollMetrics = {
        velocity: mouseMetrics.scrollVelocity,
      };

      const metrics: BehavioralMetrics = {
        mouse: mouseMetrics,
        keyboard: keyboardMetrics,
        scroll: scrollMetrics,
        timestamp: now,
      };

      console.debug('[COGA] Metrics snapshot', metrics);
      return metrics;
    } catch (error) {
      console.error('[COGA] Error in getMetrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): BehavioralMetrics {
    return {
      mouse: {
        movementVelocity: 0,
        movementAcceleration: 0,
        mouseJitter: 0,
        clickFrequencyPerMin: 0,
        multiClickRatePerMin: 0,
        pathEfficiency: 1,
        pauseRatio: 0,
        scrollVelocity: 0,
        rageClickDetected: false,
      },
      keyboard: {
        typingErrorRate: 0,
        typingSpeedPerMin: 0,
        pauseRegularity: 0,
        avgPauseDuration: 0,
      },
      scroll: {
        velocity: 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate average of an array
   */
  private calculateAverage(arr: number[]): number {
    if (!arr || arr.length === 0) return 0;
    const sum = arr.reduce((acc, val) => acc + val, 0);
    return sum / arr.length;
  }

  /**
   * Helper: coefficient of variation (std/mean)
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (!values || values.length === 0) {
      return 0;
    }

    const mean = this.calculateAverage(values);
    if (mean === 0) {
      return 0;
    }

    const variance =
      values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance) / Math.abs(mean);
  }

  /**
   * Get key statistics
   */
  getKeyStatistics(): KeyStats[] {
    try {
      const stats: KeyStats[] = [];
      const now = Date.now();
      
      // Get time window from first key press to now, or use 1 minute minimum
      const firstPress = this.keyboardData.keyPresses.length > 0 
        ? this.keyboardData.keyPresses[0].timestamp 
        : now;
      const timeWindow = Math.max(60000, now - firstPress); // At least 1 minute or actual duration
      
      // Calculate frequency for each key
      this.keyboardData.keyStats.forEach((count, key) => {
        // Count how many times this key was pressed recently
        const recentPresses = this.keyboardData.keyPresses.filter(
          (kp) => {
            const kpKey = kp.key.length === 1 ? kp.key.toLowerCase() : kp.key;
            return kpKey === key && (now - kp.timestamp < timeWindow);
          }
        );
        
        // Frequency = presses per minute
        const frequency = timeWindow > 0 ? (recentPresses.length / (timeWindow / 1000)) * 60 : 0;
        
        stats.push({
          key,
          count,
          frequency,
        });
      });
      
      // Sort by count descending
      return stats.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('[COGA] Error getting key statistics:', error);
      return [];
    }
  }

  /**
   * Get mouse zone statistics
   */
  getMouseZoneStatistics(): Array<{ zone: number; count: number; percentage: number }> {
    try {
      const total = Array.from(this.mouseData.zoneTracking.values()).reduce((sum, val) => sum + val, 0);
      
      if (total === 0) {
        return Array.from({ length: 9 }, (_, i) => ({
          zone: i,
          count: 0,
          percentage: 0,
        }));
      }
      
      const zoneStats: Array<{ zone: number; count: number; percentage: number }> = [];
      
      for (let i = 0; i < 9; i++) {
        const count = this.mouseData.zoneTracking.get(i) || 0;
        zoneStats.push({
          zone: i,
          count,
          percentage: (count / total) * 100,
        });
      }
      
      return zoneStats;
    } catch (error) {
      console.error('[COGA] Error getting mouse zone statistics:', error);
      return [];
    }
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.mouseData = {
      positions: [],
      pathPositions: [],
      clicks: [],
      velocity: [],
      acceleration: [],
      jerk: [],
      directionAngles: [],
      directionChanges: [],
      pauses: [],
      pathEfficiency: [],
      lastPosition: { x: 0, y: 0, timestamp: Date.now() },
      lastVelocity: 0,
      lastAcceleration: 0,
      lastDirection: null,
      pauseStart: null,
      zoneTracking: new Map(),
      multiClickTimestamps: [],
      lastMultiClickTimestamp: null,
    };

    this.keyboardData = {
      keyPresses: [],
      keyReleases: [],
      backspaces: 0,
      backspaceTimestamps: [],
      pauses: [],
      interKeyIntervals: [],
      holdDurations: [],
      rhythmSamples: [],
      lastKeyTime: Date.now(),
      keyStats: new Map(),
      keyDownMap: new Map(),
      errorBurstTimestamps: [],
    };

    this.scrollData = {
      velocity: [],
      acceleration: [],
      directionChanges: [],
      burstTimestamps: [],
      stopDurations: [],
      lastScroll: { y: 0, timestamp: Date.now() },
      lastVelocity: 0,
      lastDirection: null,
      lastMovementTimestamp: Date.now(),
    };
  }

  /**
   * NEW: Get raw events for sending to background
   * Returns events in a format the background can process
   */
  getEvents(): Array<{ type: string; velocity?: number; pauseDuration?: number; timestamp: number }> {
    const events: Array<{ type: string; velocity?: number; pauseDuration?: number; timestamp: number }> = [];
    
    // Add mouse movement events with velocity
    this.mouseData.velocity.forEach(vel => {
      events.push({
        type: 'mousemove',
        velocity: vel.value,
        timestamp: vel.timestamp
      });
    });
    
    // Add keyboard events with pause durations
    this.keyboardData.pauses.forEach(pause => {
      events.push({
        type: 'keypress',
        pauseDuration: pause.duration,
        timestamp: pause.timestamp
      });
    });
    
    return events;
  }

  /**
   * NEW: Clear events after sending to background
   * Keeps a small buffer to maintain continuity
   */
  clearEvents(): void {
    // Keep last 10% of data for continuity
    const keepMouseCount = Math.floor(this.mouseData.velocity.length * 0.1);
    const keepKeyCount = Math.floor(this.keyboardData.pauses.length * 0.1);
    
    this.mouseData.velocity = this.mouseData.velocity.slice(-keepMouseCount);
    this.keyboardData.pauses = this.keyboardData.pauses.slice(-keepKeyCount);
    
    // Don't clear positions or clicks as they're needed for other features
  }

  /**
   * Helper: push sample with limit
   */
  private pushSample(
    buffer: NumericSample[],
    value: number,
    timestamp: number,
    max: number = EventCapture.SAMPLE_LIMIT
  ): void {
    buffer.push({ value, timestamp });
    if (buffer.length > max) {
      buffer.shift();
    }
  }

  /**
   * Helper: filter samples within window
   */
  private filterSamples(
    samples: NumericSample[],
    now: number,
    windowMs: number = EventCapture.METRIC_WINDOW_MS
  ): NumericSample[] {
    return samples.filter((sample) => now - sample.timestamp < windowMs);
  }

  /**
   * Helper: count timestamps within window
   */
  private countRecent(
    timestamps: number[],
    now: number,
    windowMs: number = EventCapture.METRIC_WINDOW_MS
  ): number {
    return timestamps.filter((timestamp) => now - timestamp < windowMs).length;
  }

  /**
   * Helper: trim timestamp arrays
   */
  private trimTimestamps(
    timestamps: number[],
    now: number,
    windowMs: number
  ): void {
    for (let i = timestamps.length - 1; i >= 0; i -= 1) {
      if (now - timestamps[i] > windowMs) {
        timestamps.splice(i, 1);
      }
    }
  }

  /**
   * Helper: trim pause arrays (generic with timestamp property)
   */
  private trimPauseSamples(
    pauses: PauseDuration[],
    max: number
  ): void {
    if (pauses.length > max) {
      pauses.splice(0, pauses.length - max);
    }
  }

  /**
   * Helper: trim samples by limit
   */
  private trimSamples(
    samples: NumericSample[],
    max: number = EventCapture.SAMPLE_LIMIT
  ): void {
    if (samples.length > max) {
      samples.splice(0, samples.length - max);
    }
  }

  /**
   * Helper: trim arbitrary sample collection by time window
   */
  private trimSamplesByTime<T extends { timestamp: number }>(
    samples: T[],
    now: number,
    windowMs: number
  ): void {
    for (let i = samples.length - 1; i >= 0; i -= 1) {
      if (now - samples[i].timestamp > windowMs) {
        samples.splice(i, 1);
      }
    }
  }

  /**
   * Helper: normalize angle to [-PI, PI]
   */
  private normalizeAngle(angle: number): number {
    let normalized = angle;
    while (normalized > Math.PI) {
      normalized -= Math.PI * 2;
    }
    while (normalized < -Math.PI) {
      normalized += Math.PI * 2;
    }
    return normalized;
  }

  /**
   * Helper: path efficiency (straight vs actual)
   */
  private calculatePathEfficiency(positions: Position[]): number {
    if (positions.length < 2) {
      return 1;
    }

    let actualDistance = 0;
    for (let i = 1; i < positions.length; i += 1) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      actualDistance += Math.sqrt(dx * dx + dy * dy);
    }

    const first = positions[0];
    const last = positions[positions.length - 1];
    const straightDistance = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    );

    if (actualDistance === 0) {
      return 1;
    }

    const efficiency = straightDistance / actualDistance;
    return Math.max(0, Math.min(1, efficiency));
  }

  /**
   * Helper: variance (returns std deviation)
   */
  private calculateVariance(values: number[]): number {
    if (!values || values.length === 0) {
      return 0;
    }
    const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
    const variance =
      values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) /
      values.length;
    return Math.sqrt(variance);
  }
}

export default EventCapture;

