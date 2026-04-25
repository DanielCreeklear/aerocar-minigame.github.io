import { TUTORIAL_STEPS, TUTORIAL_KEYS } from "../constants/tutorial.js";

export class TutorialManager {
  constructor(gameState) {
    this.gameState = gameState;
    this.steps = TUTORIAL_STEPS;
    this.current = 0;
    this.startTime = Date.now();
    this.stepStartTime = Date.now();
    
    this._batteryAtStepStart = typeof gameState?.battery === "number" ? gameState.battery : 100;
    this._flags = {
      boostUsed:          false,
      brakedForCurve:     false,
      usedModeZInCurve:   false,
      usedModeXOnStraight: false,
      driftDetected:      false,
    };
    this.finished = false;
  }

  getStep() {
    return this.steps[this.current] || null;
  }

  markComplete() {
    this.finished = true;
    try { localStorage.setItem(TUTORIAL_KEYS.STORAGE_KEY, "1"); } catch (e) {}
  }

  advance() {
    if (this.current < this.steps.length - 1) {
      this.current += 1;
      this.stepStartTime = Date.now();
      
      const gs = this.gameState;
      this._batteryAtStepStart = typeof gs?.battery === "number" ? gs.battery : 100;
      
      const incoming = this.steps[this.current];
      if (incoming?.conditionName) {
        this._flags[incoming.conditionName] = false;
      }
    } else {
      this.markComplete();
    }
  }

  back() {
    if (this.current > 0) {
      this.current -= 1;
      this.stepStartTime = Date.now();
    }
  }

  update(dt) {
    const gs = this.gameState;
    if (!gs || this.finished) return;

    const step = this.getStep();
    if (!step) return;

    
    
    switch (step.conditionName) {
      case "boostUsed":
        
        if (!this._flags.boostUsed && typeof gs.battery === "number") {
          if (gs.battery < this._batteryAtStepStart - 3) {
            this._flags.boostUsed = true;
          }
        }
        break;

      case "brakedForCurve":
        
        if (!this._flags.brakedForCurve) {
          const upcomingCurv = gs.upcomingCurvature || 0;
          if (Math.abs(upcomingCurv) > 1.5 && (gs.speed || 0) < 14) {
            this._flags.brakedForCurve = true;
          }
        }
        break;

      case "usedModeZInCurve":
        if (!this._flags.usedModeZInCurve &&
            gs.aeroMode === "Z" &&
            Math.abs(gs.currentCurvature || 0) > 2.0) {
          this._flags.usedModeZInCurve = true;
        }
        break;

      case "usedModeXOnStraight":
        if (!this._flags.usedModeXOnStraight &&
            gs.aeroMode === "X" &&
            gs.isInModeXZone) {
          this._flags.usedModeXOnStraight = true;
        }
        break;

      case "driftDetected":
        if (!this._flags.driftDetected && gs.isDrifting) {
          const elapsed = (Date.now() - this.stepStartTime) / 1000;
          if (elapsed >= 0.3) this._flags.driftDetected = true;
        }
        break;
    }

    
    
    
    if (step.autoAdvanceOnInput && gs.lastInputAt && gs.lastInputAt > this.stepStartTime) {
      this.advance();
      return;
    }

    if (step.conditionName && this._flags[step.conditionName]) {
      this.advance();
      return;
    }

    
    if (step.timeoutMs) {
      const elapsed = Date.now() - this.stepStartTime;
      if (elapsed >= step.timeoutMs) {
        this.advance();
      }
    }
  }
}
