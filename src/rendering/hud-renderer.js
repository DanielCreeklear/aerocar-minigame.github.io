import { drawSpeedometer } from "./hud/speedometer.js";
import { drawBatteryBar } from "./hud/battery-bar.js";
import { drawAeroBadge } from "./hud/aero-badge.js";
import { drawLapPanel } from "./hud/lap-panel.js";
import { drawGripWarning } from "./hud/grip-warning.js";
import { drawCurveIndicator } from "./hud/curve-indicator.js";

const SPEEDOMETER_SCALE_TO_KMH = 17;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;

class HudRenderer {
  constructor() {
    this.displayedSpeedKmh = 0;
    this._warningTick = 0;
  }

  reset() {
    this.displayedSpeedKmh = 0;
    this._warningTick = 0;
  }

  draw(ctx, gameState, width, height) {
    const rawSpeed = Math.max(0, gameState.speed || 0);
    const targetSpeedKmh = Math.min(
      SPEEDOMETER_MAX_KMH,
      rawSpeed * SPEEDOMETER_SCALE_TO_KMH,
    );
    this.displayedSpeedKmh +=
      (targetSpeedKmh - this.displayedSpeedKmh) * SPEEDOMETER_SMOOTHING;

    this._warningTick = drawGripWarning(
      ctx,
      gameState,
      width,
      height,
      this._warningTick,
    );
    drawCurveIndicator(ctx, gameState, width);
    drawLapPanel(ctx, gameState, width, height);
    drawBatteryBar(ctx, gameState, width, height);
    drawSpeedometer(ctx, this.displayedSpeedKmh, width, height);
    drawAeroBadge(ctx, gameState, width, height);
  }
}

export { HudRenderer };
