import { TUTORIAL_STEPS, TUTORIAL_KEYS } from "../constants/tutorial.js";

// TutorialManager: gerencia o progresso do tutorial, avaliação de condições e persistência
export class TutorialManager {
  constructor(gameState) {
    this.gameState = gameState; // referência leve para leitura do estado do jogo
    this.steps = TUTORIAL_STEPS;
    this.current = 0;
    this.startTime = Date.now();
    this.stepStartTime = Date.now();
    this._flags = {
      boostUsed: false,
      brakedForCurve: false,
      usedModeZInCurve: false,
      usedModeXOnStraight: false,
      driftDetected: false,
    };
    this.finished = false;
  }

  getStep() {
    return this.steps[this.current] || null;
  }

  // marca tutorial como concluído e persiste
  markComplete() {
    this.finished = true;
    try {
      localStorage.setItem(TUTORIAL_KEYS.STORAGE_KEY, "1");
    } catch (e) {}
  }

  // avança para próximo step
  advance() {
    if (this.current < this.steps.length - 1) {
      this.current += 1;
      this.stepStartTime = Date.now();
    } else {
      this.markComplete();
    }
  }

  // retrocede (se necessário)
  back() {
    if (this.current > 0) {
      this.current -= 1;
      this.stepStartTime = Date.now();
    }
  }

  // atualiza flags com base no estado do jogo (chamado a cada frame)
  update(dt) {
    const gs = this.gameState;
    if (!gs) return;

    // Detect boost usage
    if (!this._flags.boostUsed && typeof gs.battery === "number") {
      // if battery decreased from max (rough heuristic)
      if (gs.battery < 100) this._flags.boostUsed = true;
    }

    // Detect braking before a curve: if upcoming curvature and speed reduced
    const upcomingCurv = gs.upcomingCurvature || 0;
    if (!this._flags.brakedForCurve && Math.abs(upcomingCurv) > 1.5) {
      // expected to brake: check speed drop below threshold when near curve
      if (gs.speed < 12) this._flags.brakedForCurve = true;
    }

    // Mode Z used while in a curve
    if (!this._flags.usedModeZInCurve && gs.aeroMode === "Z" && Math.abs(gs.currentCurvature || 0) > 2.5) {
      this._flags.usedModeZInCurve = true;
    }

    // Mode X used in long straight (isInModeXZone)
    if (!this._flags.usedModeXOnStraight && gs.aeroMode === "X" && gs.isInModeXZone) {
      this._flags.usedModeXOnStraight = true;
    }

    // Drift detection (reuses game state's isDrifting if present)
    if (!this._flags.driftDetected && (gs.isDrifting || false)) {
      // require a small duration
      const since = (Date.now() - this.stepStartTime) / 1000;
      if (since >= 0.5) this._flags.driftDetected = true;
    }

    // evaluate completion for current step
    const step = this.getStep();
    if (!step || this.finished) return;

    if (step.autoAdvanceOnInput && gs.lastInputAt && gs.lastInputAt > this.stepStartTime) {
      this.advance();
      return;
    }

    if (step.conditionName && this._flags[step.conditionName]) {
      this.advance();
      return;
    }

    // timeout fallback: after timeoutMs advance anyway (shows hint)
    if (step.timeoutMs) {
      const elapsed = Date.now() - this.stepStartTime;
      if (elapsed >= step.timeoutMs) {
        this.advance();
      }
    }
  }
}
