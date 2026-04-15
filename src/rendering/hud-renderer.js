import { drawSpeedometer } from "./hud/speedometer.js";
import { drawBatteryBar } from "./hud/battery-bar.js";
import { drawAeroBadge } from "./hud/aero-badge.js";
import { drawLapPanel } from "./hud/lap-panel.js";
import { drawGripWarning } from "./hud/grip-warning.js";
import { drawCurveIndicator } from "./hud/curve-indicator.js";

const SPEEDOMETER_SCALE_TO_KMH = 17;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;

// Touch zone width ratios — must match input.js portrait ratios exactly.
const TOUCH_BRAKE_RATIO = 0.35;
const TOUCH_BOOST_RATIO = 0.65;
const TOUCH_HINT_FONT = "'Barlow Condensed', 'Segoe UI', Arial, sans-serif";

function drawTouchZoneHints(ctx, gameState, width, height) {
  const { isBoosting, isBraking } = gameState;
  const hintH = Math.max(52, height * 0.08);
  const hintY = height - hintH;
  const sz = Math.max(15, Math.min(22, width * 0.05));

  ctx.save();

  // Brake zone background (left)
  ctx.fillStyle = "#CC001E";
  ctx.globalAlpha = isBraking ? 0.22 : 0.07;
  ctx.fillRect(0, hintY, width * TOUCH_BRAKE_RATIO, hintH);

  // Boost zone background (right)
  ctx.fillStyle = "#C87D12";
  ctx.globalAlpha = isBoosting ? 0.22 : 0.07;
  ctx.fillRect(
    width * TOUCH_BOOST_RATIO,
    hintY,
    width * (1 - TOUCH_BOOST_RATIO),
    hintH,
  );

  // Divider lines
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#CC001E";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * TOUCH_BRAKE_RATIO, hintY);
  ctx.lineTo(width * TOUCH_BRAKE_RATIO, height);
  ctx.stroke();
  ctx.strokeStyle = "#C87D12";
  ctx.beginPath();
  ctx.moveTo(width * TOUCH_BOOST_RATIO, hintY);
  ctx.lineTo(width * TOUCH_BOOST_RATIO, height);
  ctx.stroke();

  // Labels
  ctx.font = `700 ${sz}px ${TOUCH_HINT_FONT}`;
  ctx.textBaseline = "middle";
  const midY = hintY + hintH * 0.5;

  ctx.globalAlpha = isBraking ? 1.0 : 0.45;
  ctx.fillStyle = "#CC001E";
  ctx.textAlign = "left";
  ctx.fillText("◀ FREIO", 10, midY);

  ctx.globalAlpha = isBoosting ? 1.0 : 0.45;
  ctx.fillStyle = "#C87D12";
  ctx.textAlign = "right";
  ctx.fillText("BOOST ▶", width - 10, midY);

  ctx.globalAlpha = 1;
  ctx.restore();
}

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

    const isPortrait = height > width;

    if (isPortrait) {
      drawTouchZoneHints(ctx, gameState, width, height);
    }

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
    drawSpeedometer(ctx, this.displayedSpeedKmh, width, height, isPortrait);
    drawAeroBadge(ctx, gameState, width, height);
  }
}

export { HudRenderer };
