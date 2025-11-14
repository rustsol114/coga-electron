# **COGA Simplified MVP Dev Plan**

## **Real-Time Stress Detection & Intervention System**

### **Summary**

This document outlines a pragmatic 8-week development plan for COGA's MVP, structured as 4 incremental releases (one every 2 weeks). Each phase adds functionality across all architecture layers while maintaining simplicity and focusing on user feedback collection.

**Core Principle: Start ultra-light, gather feedback, iterate quickly.**

---

## **Phase 1: Foundation (Weeks 1-3)**

### **Release: Basic Stress Detection & Single Intervention**

#### **1\. Distribution Layer**

**Bookmarklet Only** (coga.min.js \< 50KB)

javascript  
*// One-click activation*  
javascript:(function(){  
  const script \= document.createElement('script');  
  script.src \= 'https://cdn.coga.io/v0/coga.min.js';  
  document.head.appendChild(script);

})();

#### **2\. Core Detection Engine**

**Behavioral Metrics Only**

1. **Mouse Tracking:**  
1. Velocity changes (baseline vs current)  
2. Click frequency (rage clicks detection)  
3. Movement jitter  
2. **Keyboard Patterns:**  
4. Typing speed variations  
5. Backspace frequency  
6. Pause patterns

**Simple Baseline Calibration:**

* 3-minute initial calibration  
* Median \+ MAD (Median Absolute Deviation)  
* Store in localStorage  
* Basic context awareness (time of day)

#### **3\. Stress Scoring**

**Simple Z-Score Calculation:**

javascript  
*// Ultra-simple stress score*  
const stressScore \= {  
  mouse: (current \- baseline) / stdDev,  
  keyboard: (current \- baseline) / stdDev,  
  combined: weightedAverage(\[mouse, keyboard\])  
};

*// Threshold: score \> 2.5 \= intervention*

#### **4\. Intervention System**

**3 Core Interventions Only (5):**

1. **Box Breathing (3 subversions: 15 seconds \- 30 seconds \-60-seconds)**  
   * Visual guide overlay  
   * 4-4-4-4 pattern  
   * Completion tracking  
2. **Eye Rest Reminder**  
   * 20-20-20 rule  
   * Subtle notification  
   * Quick dismiss option  
3. **Micro-Break Prompt**  
   * Stand/stretch suggestion  
   * 30-second timer  
   * Skip option available

#### 

#### 

#### **5\. UI/Widget**

**Minimal Floating Indicator:**

* Small dot (green/yellow/red)  
* Click for stress score  
* Settings: sensitivity (low/medium/high)  
* Intervention frequency cap (max 3/hour)  
* *Will share other core settings \- those are easy to add with ai* 

#### **6\. Data Collection**

**Anonymous Event Logging:**

javascript  
const eventLog \= {  
  timestamp: Date.now(),  
  stressScore: score,  
  interventionShown: type,  
  completed: boolean,  
  dismissed: boolean,  
  contextFlags: \['typing', 'clicking', 'scrolling'\]  
};

*// Store locally, batch upload every hour*

#### **7\. Annoyance Prevention**

* 8-minute cooldown between interventions  
* Auto-snooze if dismissed 2x in a row  
* Disable during password fields  
* Pause during video calls (basic detection)

**Deliverables Week 2:**

* Working bookmarklet  
* 3-5 interventions functional  
* Basic stress detection  
* Anonymous usage analytics

Saul. will send this to 10-25 users to collect feedback as we build the next micro-release

\===========================================================

**Phase 2: Enhancement (Weeks 3-4)**

### **Release: Improved Detection & Personalization**

#### **1\. Distribution Layer**

* Add Chrome extension scaffold (still using bookmarklet core)  
* Persistent settings across sessions  
* Add basic onboarding flow

#### **2\. Core Detection Engine**

**Add Advanced Behavioral Metrics:**

* Scroll velocity & patterns  
* Double/triple click detection  
* Movement acceleration patterns  
* Path efficiency (straight vs curved)

**Improved Calibration:**

* Contextual baselines (morning/afternoon/evening)  
* Activity-based adjustment  
* 7-day rolling average

#### **3\. Intervention System**

**\+Add 3 More Interventions:**   
4\. **Progressive Muscle Relaxation (30s)**   
5\. **5-4-3-2-1 Grounding**   
6\. **Coherence Breathing (HRV pattern)**

**Adaptive Selection:**

* Track intervention effectiveness  
* Basic A/B testing  
* Time-of-day optimization

#### **4\. Physiological Integration (Prep Only)**

**Wearable Connection Framework:**

* OAuth setup for Whoop API  
* Basic data structure for HRV/RHR  
* Placeholder UI for connection

#### **5\. Rules Engine Expansion**

* Payment form detection  
* Meeting calendar awareness (if available)  
* App-specific rules (Gmail, Slack detection)

#### **6\. Dashboard V1**

* Daily stress patterns visualization  
* Intervention effectiveness metrics  
* Export data option (CSV)

**Deliverables Week 4:**

* 6 interventions available  
* Smarter detection algorithm  
* Basic personalization  
* Dashboard for insights

\============================================

## **Phase 3: Integration (Weeks 5-6)**

### **Release: Wearable Support & Team Features**

#### **1\. Physiological Integration**

**Whoop Integration (Primary Focus):**

* Real-time HRV streaming  
* Resting heart rate baseline  
* Recovery score integration  
* Sleep quality context

**Data Fusion:**    
javascript

const stressScore \= {  
  behavioral: 0.6 \* behavioralScore,  
  physiological: 0.4 \* whoop.hrvDeviation,  
  combined: weightedFusion(behavioral, physiological)

};

#### 

#### **2\. Enhanced Detection??**

* Multi-signal correlation  
* Predictive stress forecasting (next 5 minutes)  
* Stress type classification (deadline vs fatigue)

#### **3\. Intervention Library Expansion**

**Add 4 More Interventions:** 7\. **Micro-meditation (60s)** 8\. **Desk yoga sequence** 9\. **Binaural beats (optional audio)** 10\. **Quick wins task suggestion**

#### **4\. Team Features (Beta OrSkip till)**

* Anonymous team stress heatmap  
* Aggregate patterns dashboard  
* Department-level insights  
* Manager alerts (opt-in)

#### **5\. Chrome Extension V1**

* Full migration from bookmarklet  
* Background service worker  
* Cross-tab synchronization  
* Auto-updates

#### **6\. API Development v1**

* REST endpoints for data access  
* Webhook support for integrations  
* Basic rate limiting

**Deliverables Week 6:**

* Whoop fully integrated  
* 10 interventions available  
* Team dashboard beta\* (to be discussed)  
* API v1 documented

\============================

## 

## 

## **Phase 4: Polish & Scale (Weeks 7-8)**

### **Release: Production-Ready MVP**

#### **1\. Additional Wearables  (maybe only one more \- OR maybe None we keep only Whoop)**

* Apple Watch support  
* Oura Ring integration  
* Garmin Connect (basic)

#### **2\. AI/ML Features**

**Contextual Bandits Implementation:**

* Intervention optimization  
* Personalized thresholds  
* Effectiveness prediction

#### **3\. Safety Features (user defined micro-decision CTA)**

* Delayed email sending (high stress detected)  
* Trade confirmation double-check  
* Document review pause suggestion  
* Manager escalation (critical stress)

#### **4\. Enterprise Features  (maybe delayed or MVPed to the very min)**

* SSO support prep  
* Admin console  
* Compliance reporting  
* Data retention policies

#### **5\. Performance & Reliability**

* Code splitting & optimization  
* Error recovery mechanisms  
* Offline mode support \- VERY IMPORTANT  
* CDN distribution

#### **6\. Full Intervention Library**

**Final 10 Interventions (20 total or all 40 if easy to add now that we have core Lib built):**

1. Nature sounds immersion  
2. Humor break (memes/comics)  
3. Hydration reminder  
4. Posture check & correction  
5. Social connection prompt  
6. Gratitude moment  
7. Power pose suggestion  
8. Color breathing  
9. Hand massage guide  
10. Energy snack reminder

**Deliverables Week 8:**

* 20 interventions available  
* 3 wearable integrations  
* Enterprise features ready  
* \<100KB total package size

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## **Technical Implementation Details**

### **Core Architecture Flow**

**User → Bookmarklet/Extension → Detection Engine → Scoring Algorithm**  
         **↓                          ↓                    ↓**  
    **Local Storage            Baseline Manager      Decision Engine**  
         **↓                          ↓                    ↓**  
    **Data Collector            Context Rules      Intervention Manager**  
         **↓                          ↓                    ↓**

    **Analytics Pipeline        Annoyance Rules        UI Widget**

### **Data Models**

#### **Stress Event**

javascript  
{  
  id: uuid(),  
  timestamp: ISO8601,  
  scores: {  
    behavioral: {  
      mouse: 0\-100,  
      keyboard: 0\-100,  
      scroll: 0\-100  
    },  
    physiological: {  
      hrv: 0\-100,  
      rhr: 0\-100,  
      temp: 0\-100  
    },  
    combined: 0\-100  
  },  
  context: {  
    app: 'gmail|slack|docs|other',  
    timeOfDay: 'morning|afternoon|evening',  
    dayOfWeek: 0\-6,  
    activeWindow: boolean  
  },  
  intervention: {  
    triggered: boolean,  
    type: string,  
    completed: boolean,  
    effectiveness: 0\-100  
  }

}

#### **User Settings**

javascript  
{  
  sensitivity: 'low|medium|high',  
  interventions: {  
    enabled: \['breathing', 'break', 'rest'\],  
    frequency: {  
      maxPerHour: 3,  
      maxPerDay: 12,  
      cooldown: 480 *// seconds*  
    }  
  },  
  wearables: {  
    whoop: { connected: boolean, token: encrypted },  
    apple: { connected: boolean, token: encrypted }  
  },  
  privacy: {  
    anonymousMode: boolean,  
    dataSharing: boolean,  
    teamVisible: boolean  
  }

}

### **Performance Targets**

* Initial load: \<2 seconds  
* Stress detection latency: \<100ms  
* Intervention trigger: \<500ms  
* Memory footprint: \<50MB  
* CPU usage: \<2% idle, \<5% active

### **Browser Compatibility**

* Chrome 90+ (primary)  
* Firefox 95+ (secondary)  
* Safari 15+ (basic support)  
* Edge 90+ (full support)

---

## **Development Priorities & Risk Mitigation**

### **Phase 1 Critical Success Factors**

1. **Zero-friction installation** (one-click bookmarklet) —  MUST/CRUCIAL  
2. **No false positives** (conservative thresholds)  — difficult I know but doable with time  
3. **Non-intrusive interventions** (user in control)— YES\!  
4. **Instant value** (works immediately)   —  MUST/CRUCIAL

### **Known Challenges & Solutions**

| Challenge | Risk | Mitigation (solucion) |
| ----- | ----- | ----- |
| False positives | High annoyance, uninstalls | Conservative thresholds, easy calibration |
| Browser restrictions | Limited API access | Graceful degradation, multiple detection methods |
| Wearable latency | Delayed interventions | Behavioral detection primary, physio secondary |
| Privacy concerns | Low adoption | Local-first storage, anonymous by default |
| Intervention fatigue | Reduced effectiveness | Smart scheduling, variety, user control |

### 

### **Testing Strategy**

* **RELEASE 1 Week 1-3:** Internal team testing (+5-25 users)  
* **RELEASE 2 Week 3-5:** Alpha users (25-50 users)  
* **RELEASE 3 Week 5-7:** Beta expansion (50-100 users)  
* **RELEASE 4 Week 7-9:** Soft launch (500+ users)

### **Success Metrics**

| Metric | Release 1 | Release  2 | Release  3 | Release 4 |
| ----- | ----- | ----- | ----- | ----- |
| Daily Active Users | 5-25 | 25-50 | 50-100 | 500+ |
| Intervention Completion Rate | \>40% | \>50% | \>60% | \>70% |
| False Positive Rate | \<20% | \<15% | \<10% | \<5% |
| User Retention (7-day) | \>30% | \>40% | \>50% | \>60% |
| **Stress Detection Accuracy** | **\>70%** | **\>80%** | **\>85%** | **\>92%** |

\====================

## **Dev resourcing:** 

### **Dev Lead \- SAUL**

* Weeks 1-4: Core functionality  
  * Weeks 5-8: Integrations & polish

### **Optional Resources (Phase 3+)**

* **Contract DevOps** (2-5 hrs/week) \- Infrastructure  
* **QA Testing** (5-10 hrs/week) \- Cross-browser testing  
* **Data Analysis** (5 hrs/week) \- Metrics & insights

### **Infrastructure Costs (Monthly)**

* **Phase 1-2:** \~$25-50 (CDN, basic analytics)  
* **Phase 3:** \~$50-100 (API hosting, data storage)  
* **Phase 4:** \~$100-150  (scaled infrastructure)

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

## **Appendix: Quick Start Guide for Saul (tentative/suggested)**

### **Week 1 Checklist**

□ Set up GitHub repo with CI/CD  
□ Create bookmarklet bundler (Webpack/Rollup)  
□ Implement EventCapture.js (mouse \+ keyboard)  
□ Build BaselineManager.js (simple calibration)  
□ Create StressDetector.js (z-score calculation)  
□ Design minimal Widget.js (floating dot)  
□ Test box breathing intervention

□ Deploy to CDN (coga.min.js)

### **Development Environment**

bash  
*\# Initial setup*  
git clone https://github.com/cogalabs/coga-mvp  
npm install  
npm run dev  *\# Hot reload development*

*\# Build for production*  
npm run build  *\# Creates coga.min.js*  
npm run deploy *\# Pushes to CDN*

*\# Testing*  
npm run test  *\# Unit tests*

npm run e2e   *\# Browser automation*

### **Code Architecture**

/src  
  /core  
    EventCapture.js      \# Browser event listeners  
    BaselineManager.js   \# Personal calibration  
    StressDetector.js    \# Scoring algorithm  
  /interventions  
    breathing.js         \# Breathing exercises  
    breaks.js           \# Break reminders  
    recovery.js         \# Recovery techniques  
  /rules  
    AnnoyanceRules.js   \# Spam prevention  
    ContextRules.js     \# Situational awareness  
  /ui  
    Widget.js           \# Main UI component  
    Dashboard.js        \# Analytics view  
  /integrations  
    whoop.js           \# Whoop API wrapper  
    calendar.js        \# Calendar integration  
  /utils  
    storage.js         \# LocalStorage wrapper

    analytics.js       \# Event tracking

---

## **Steps**

1. **Immediate (Yesterday):**  
   * Finalize tech stack decision  
   * Set up development environment  
   * Create GitHub repository  
2. **Phase 1 Launch (Week 2-3):**  
   * Internal testing with team  
   * Gather initial feedback  
   * Iterate on intervention timing  
3. **Continuous (Weeks 2-8):**  
   * standup check-ins twice a week or as needed  
   * Weekly user feedback sessions (or as they coem we can check them every few days or so or better in real time)   
   * Bi-weekly release cycle (will maek it fun,ongoing, feasible and smart) 

Saul, See why I tried to make a light roadmap that provides a clear path from ultra-light MVP to production-ready system (which later will need a lot more work and engineering but for much later) all while maintaining flexibility for user feedback and rapid iteration, so it is fun stress-free dev work. 

