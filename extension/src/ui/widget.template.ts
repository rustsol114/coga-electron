/**
 * widget.template.ts
 * HTML template for the COGA widget - Modern Design
 */

export const widgetTemplate = `
  <div class="coga-widget-dot" id="coga-widget-dot" data-stress-level="normal">
    <div class="coga-widget-inner"></div>
  </div>
  <div class="coga-widget-panel" id="coga-widget-panel" style="display: none;">
    <div class="coga-widget-header">
      <div class="coga-brand">COGA Activity Monitor</div>
      <div class="coga-header-actions">
        <button class="coga-header-btn" id="coga-recalibrate-btn" aria-label="Recalibrate" title="Recalibrate">
          <i data-lucide="refresh-cw"></i>
        </button>
        <button class="coga-header-btn" id="coga-settings-btn" aria-label="Settings" title="Settings">
          <i data-lucide="settings"></i>
        </button>
        <button class="coga-widget-close" id="coga-widget-close" aria-label="Close panel" title="Close">
          <i data-lucide="x"></i>
        </button>
      </div>
    </div>
    <div class="coga-widget-content">
      <!-- Calibration prompt (shown if no baseline) -->
      <div class="coga-calibration-prompt" id="coga-calibration-prompt" style="display: none;">
        <div class="coga-calibration-icon"><i data-lucide="locate-fixed"></i></div>
        <h3>First Time Setup</h3>
        <p>Calibrate your baseline in <span id="coga-calibration-duration-value">--</span> for accurate stress detection.</p>
        <button class="coga-btn coga-btn-primary" id="coga-start-calibration">Start Calibration</button>
      </div>
      
      <!-- Main dashboard (shown if baseline exists) -->
      <div class="coga-dashboard" id="coga-dashboard" style="display: none;">
        <!-- Stress Level Detection -->
        <div class="coga-stress-section">
          <div class="coga-stress-header">
            <span class="coga-stress-label">Stress Level</span>
            <div class="coga-stress-value-group">
              <span class="coga-stress-value" id="coga-stress-value">Normal</span>
            </div>
          </div>
          <div class="coga-stress-progress-container">
            <div class="coga-stress-progress-bar" id="coga-stress-progress-bar" style="width: 0%"></div>
          </div>
          <div class="coga-stress-score-percentage">
            <span class="coga-stress-score" id="coga-stress-score">0.00σ</span>
            <span id="coga-stress-progress-label">0%</span>
          </div>
        </div>

        <!-- Main Stats: Mouse and Keyboard Z-scores (Large Cards) -->
        <div class="coga-main-stats">
          <div class="coga-main-stat-card">
            <div class="coga-main-stat-header">
              <i data-lucide="mouse-pointer-2" class="coga-main-stat-icon"></i>
              <span class="coga-main-stat-label">Mouse</span>
            </div>
            <span class="coga-main-stat-value" id="coga-mouse-score">0.00</span>
          </div>
          <div class="coga-main-stat-card">
            <div class="coga-main-stat-header">
              <i data-lucide="keyboard" class="coga-main-stat-icon"></i>
              <span class="coga-main-stat-label">Keyboard</span>
            </div>
            <span class="coga-main-stat-value" id="coga-keyboard-score">0.00</span>
          </div>
        </div>

        <!-- Main Metrics Section (Prominently Displayed) -->
        <div class="coga-main-metrics-section">
          <h3 class="coga-main-metrics-title">Real-time Metrics</h3>
          <div class="coga-main-metrics-grid">
            <!-- Mouse Metrics -->
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="gauge" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Mouse Velocity</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-mouse-velocity">0.00 px/s</div>
            </div>
            
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="pointer" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Click Frequency</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-click-frequency">0.00 /min</div>
            </div>
            
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="alert-circle" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Rage Clicks</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-rage-clicks">No</div>
            </div>
            
            <!-- Keyboard Metrics -->
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="zap" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Typing Speed</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-typing-speed">0.00 /min</div>
            </div>
            
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="type" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Typing Error Rate</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-typing-error">0.00 /10</div>
            </div>
            
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="clock" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Avg Pause</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-avg-pause">0.00s</div>
            </div>
            
            <!-- Scroll Metric -->
            <div class="coga-main-metric-item">
              <div class="coga-main-metric-header">
                <i data-lucide="scroll-text" class="coga-main-metric-icon"></i>
                <span class="coga-main-metric-label">Scroll Velocity</span>
              </div>
              <div class="coga-main-metric-value" id="coga-main-scroll-velocity">0.00 px/s</div>
            </div>
          </div>
        </div>

        <!-- Textarea for Free Writing -->
        <div class="coga-textarea-section">
          <h3 class="coga-textarea-title">Test Typing Detection</h3>
          <textarea 
            id="coga-test-textarea" 
            class="coga-test-textarea" 
            placeholder="Type here to test typing detection, error rate, and pause detection..."
            rows="6"
          ></textarea>
        </div>
        <div class="coga-compact-stats-collapsible">
          <button class="coga-collapsible-toggle" id="coga-compact-toggle" type="button" aria-expanded="true">
            Compact Stats
            <i data-lucide="chevron-down" class="coga-collapsible-icon"></i>
          </button>
          <div class="coga-compact-stats" id="coga-compact-stats">
            <!-- Compact Stats Grid -->
            <div class="coga-compact-stats">
              <!-- Typing Errors -->
              <div class="coga-compact-stat">
                <i data-lucide="type" class="coga-compact-stat-icon"></i>
                <div class="coga-compact-stat-content">
                  <div>
                    <span class="coga-compact-stat-label">Typing Err.</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-typing-errors">0.00</span>
                    <span class="coga-compact-stat-unit">/10 keys</span>
                  </div>
                </div>
              </div>

              <!-- Click Frequency -->
              <div class="coga-compact-stat">
                <i data-lucide="pointer" class="coga-compact-stat-icon"></i>

                <div class="coga-compact-stat-content">
                  <div>
                    <span class="coga-compact-stat-label">Clicks</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-click-frequency">0.00</span>
                    <span class="coga-compact-stat-unit">/min</span>
                  </div>
                </div>
              </div>

              <!-- Multi Clicks -->
              <div class="coga-compact-stat">
                <i data-lucide="mouse-pointer-2" class="coga-compact-stat-icon"></i>
                <div class="coga-compact-stat-content">
                  <div>
                    <span class="coga-compact-stat-label">Multi</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-multi-clicks">0.00</span>
                    <span class="coga-compact-stat-unit">/min</span>
                  </div>
                </div>
              </div>

              <!-- Mouse Velocity -->
              <div class="coga-compact-stat">
                <i data-lucide="gauge" class="coga-compact-stat-icon"></i>
                <div class="coga-compact-stat-content">
                  <div>
                    <span class="coga-compact-stat-label">Velocity</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-mouse-velocity">0.00</span>
                    <span class="coga-compact-stat-unit">px/s</span>
                  </div>
                </div>
              </div>

              <!-- Mouse Acceleration -->
              <div class="coga-compact-stat">
                <i data-lucide="move" class="coga-compact-stat-icon"></i>
                <div class="coga-compact-stat-content">
                  <div>
                  </div>
                  <div>
                    <span class="coga-compact-stat-label">Accel.</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-mouse-acceleration">0.00</span>
                    <span class="coga-compact-stat-unit">px/s²</span>
                  </div>
                </div>
              </div>

              <!-- Scroll Velocity -->
              <div class="coga-compact-stat">
                <i data-lucide="scroll-text" class="coga-compact-stat-icon"></i>
                <div class="coga-compact-stat-content">
                  <div>
                    <span class="coga-compact-stat-label">Scroll</span>
                  </div>
                  <div>
                    <span class="coga-compact-stat-value" id="coga-scroll-velocity">0.00</span>
                    <span class="coga-compact-stat-unit">px/s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Calibration in progress -->
      <div class="coga-calibration-progress" id="coga-calibration-progress" style="display: none;">
        <div class="coga-calibration-header">
          <i data-lucide="target" class="coga-calibration-icon-large"></i>
          <h3>Calibrating...</h3>
        </div>
        <div class="coga-progress-bar-container">
          <div class="coga-progress-bar" id="coga-progress-bar"></div>
        </div>
        <div class="coga-progress-text">
          <span id="coga-progress-percent">0%</span>
          <span class="coga-progress-time" id="coga-progress-time">0:00 / --:--</span>
        </div>
        <div class="coga-calibration-tips">
          <p id="coga-calibration-message">Learning your normal work patterns to detect stress accurately.</p>
          <ul class="coga-tips-list">
            <li><i data-lucide="mouse-pointer-2" class="coga-tip-icon"></i> Move your mouse</li>
            <li><i data-lucide="keyboard" class="coga-tip-icon"></i> Type naturally</li>
            <li><i data-lucide="scroll-text" class="coga-tip-icon"></i> Scroll through pages</li>
          </ul>
        </div>
      </div>

      <!-- Settings view -->
      <div class="coga-settings-view" id="coga-settings-view" style="display: none;">
        <div class="coga-settings-header">
          <button class="coga-settings-back-btn" id="coga-settings-back-btn" aria-label="Back to dashboard" title="Back">
            <i data-lucide="arrow-left"></i>
          </button>
          <div class="coga-settings-header-text">
            <h3>Settings</h3>
            <p>Fine-tune your assistant without leaving this page.</p>
          </div>
        </div>

        <div class="coga-settings-progress">
          <div class="coga-settings-progress-track">
            <div class="coga-settings-progress-bar" id="coga-settings-progress-bar"></div>
          </div>
          <span class="coga-settings-progress-label">
            Step <span id="coga-settings-step-indicator">1</span> of 4
          </span>
        </div>

        <div class="coga-settings-steps" id="coga-settings-steps">
          <!-- Step 1: Sensitivity -->
          <section class="coga-settings-step" data-step="0">
            <div class="coga-settings-step-title">
              <span class="coga-settings-step-number">01</span>
              <div>
                <h4>Stress Detection Sensitivity</h4>
                <p>Control how quickly the assistant responds to stress signals.</p>
              </div>
            </div>
            <div class="coga-sensitivity-buttons" role="group" aria-label="Sensitivity levels">
              <button class="coga-sensitivity-btn" data-sensitivity="low" id="coga-settings-sensitivity-low">
                <span class="coga-sensitivity-label">Low</span>
                <span class="coga-sensitivity-desc">Balanced detection</span>
              </button>
              <button class="coga-sensitivity-btn" data-sensitivity="medium" id="coga-settings-sensitivity-medium">
                <span class="coga-sensitivity-label">Medium</span>
                <span class="coga-sensitivity-desc">Recommended</span>
              </button>
              <button class="coga-sensitivity-btn" data-sensitivity="high" id="coga-settings-sensitivity-high">
                <span class="coga-sensitivity-label">High</span>
                <span class="coga-sensitivity-desc">Aggressive detection</span>
              </button>
            </div>
            <div class="coga-settings-section-message" data-section="sensitivity"></div>
          </section>

          <!-- Step 2: Intervention Limits -->
          <section class="coga-settings-step" data-step="1">
            <div class="coga-settings-step-title">
              <span class="coga-settings-step-number">02</span>
              <div>
                <h4>Intervention Limits</h4>
                <p>Prevent fatigue by defining how often interventions can appear.</p>
              </div>
            </div>
            <div class="coga-limits-grid">
              <label class="coga-limit-field">
                <span>Cooldown (min)</span>
                <input type="number" id="coga-settings-cooldown-minutes" min="1" max="60" value="8" />
              </label>
              <label class="coga-limit-field">
                <span>Max per hour</span>
                <input type="number" id="coga-settings-max-per-hour" min="1" max="10" value="2" />
              </label>
              <label class="coga-limit-field">
                <span>Max per day</span>
                <input type="number" id="coga-settings-max-per-day" min="1" max="50" value="6" />
              </label>
            </div>
            <div class="coga-settings-section-actions">
              <button class="coga-secondary-btn" id="coga-settings-reset-limits">Reset</button>
              <button class="coga-primary-btn" id="coga-settings-save-limits">Save Limits</button>
            </div>
            <div class="coga-settings-section-message" data-section="limits"></div>
          </section>

          <!-- Step 3: Suppressed Domains -->
          <section class="coga-settings-step" data-step="2">
            <div class="coga-settings-step-title">
              <span class="coga-settings-step-number">03</span>
              <div>
                <h4>Suppressed Domains</h4>
                <p>List domains where monitoring and interventions stay silent.</p>
              </div>
            </div>
            <div class="coga-domains-input">
              <input type="text" id="coga-settings-domain-input" placeholder="Enter domain (e.g., gmail.com)" />
              <button class="coga-primary-btn" id="coga-settings-add-domain">Add</button>
            </div>
            <div class="coga-domains-list" id="coga-settings-domains-list">
              <p class="coga-domains-empty">No suppressed domains yet</p>
            </div>
            <div class="coga-settings-section-message" data-section="domains"></div>
          </section>

          <!-- Step 4: Enabled Interventions -->
          <section class="coga-settings-step" data-step="3">
            <div class="coga-settings-step-title">
              <span class="coga-settings-step-number">04</span>
              <div>
                <h4>Enabled Interventions</h4>
                <p>Select the playbook available when stress is detected.</p>
              </div>
            </div>
            <div class="coga-interventions-list">
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-oneBreathReset" />
                <div>
                  <strong>One-Breath Reset</strong>
                  <span>10-second inhale/exhale cycle for quick resets.</span>
                </div>
              </label>
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-boxBreathing" />
                <div>
                  <strong>Box Breathing (4-4-4-4)</strong>
                  <span>60-second guided breathing for deeper calm.</span>
                </div>
              </label>
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-twentyTwentyGaze" />
                <div>
                  <strong>20-20-20 Eye Reset</strong>
                  <span>Refresh focus by looking 20 ft away every 20 seconds.</span>
                </div>
              </label>
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-figureEightSmoothPursuit" />
                <div>
                  <strong>Figure-8 Smooth Pursuit</strong>
                  <span>30-second figure-8 eye tracking overlay.</span>
                </div>
              </label>
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-nearFarFocusShift" />
                <div>
                  <strong>Near-Far Focus Shift</strong>
                  <span>Alternate near/far focus to relax the ciliary muscles.</span>
                </div>
              </label>
              <label class="coga-intervention-option">
                <input type="checkbox" id="coga-settings-intervention-microBreak" />
                <div>
                  <strong>3-Minute Micro-Break</strong>
                  <span>Mix of breathing, stretch, and movement with optional chime.</span>
                </div>
              </label>
            </div>
            <div class="coga-settings-section-actions">
              <button class="coga-secondary-btn" id="coga-settings-select-all">Select All</button>
              <button class="coga-primary-btn" id="coga-settings-save-interventions">Save Selection</button>
            </div>
            <div class="coga-settings-section-message" data-section="interventions"></div>
          </section>
        </div>

        <div class="coga-settings-footer">
          <button class="coga-secondary-btn" id="coga-settings-prev-step" aria-label="Previous step">
            <i data-lucide="arrow-left"></i>
            <span>Previous</span>
          </button>
          <button class="coga-primary-btn" id="coga-settings-next-step" aria-label="Next step">
            <span>Next</span>
            <i data-lucide="arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
`;