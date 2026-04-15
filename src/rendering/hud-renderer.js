import { drawSpeedometer } from "./hud/speedometer.js";
import { drawBatteryBar } from "./hud/battery-bar.js";
import { drawAeroBadge } from "./hud/aero-badge.js";
import { drawLapPanel } from "./hud/lap-panel.js";
import { drawGripWarning } from "./hud/grip-warning.js";
import { drawCurveIndicator } from "./hud/curve-indicator.js";
import { createWindState, drawWindStreaks } from "./hud/wind-streaks.js";
import { drawCentrifugalSlideEffect } from "./hud/centrifugal-slide.js";

const SPEEDOMETER_SCALE_TO_KMH = 17;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;

const TOUCH_BRAKE_RATIO = 0.35;
const TOUCH_BOOST_RATIO = 0.65;
const TOUCH_HINT_FONT = "'Barlow Condensed', 'Segoe UI', Arial, sans-serif";

const RESCUE_FONT = "'Barlow Condensed', 'Segoe UI', Arial, sans-serif";

function drawRescueBanner(ctx, gameState, width, height) {
  const timer = gameState.rescueFlashTimer || 0;
  if (timer <= 0) return;

  const alpha = Math.min(1, timer / 1.5);

  ctx.save();
  if (timer > 10.85) {
    ctx.globalAlpha = 0.35 * Math.min(1, (timer - 10.85) / 0.1);
    ctx.fillStyle = "#CC001E";
    ctx.fillRect(0, 0, width, height);
  }

  // Centered banner
  const bh = Math.max(48, height * 0.1);
  const by = height * 0.38;
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = "#0a0008";
  ctx.fillRect(0, by, width, bh);
  ctx.strokeStyle = "#CC001E";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, by, width, bh);

  const sz = Math.max(18, Math.min(32, width * 0.055));
  ctx.globalAlpha = alpha;
  ctx.font = `700 ${sz}px ${RESCUE_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#CC001E";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#FF2244";
  ctx.fillText("▲  PENALIDADE — RESGATE  ▲", width * 0.5, by + bh * 0.5);

  ctx.restore();
}

function drawTouchZoneHints(ctx, gameState, width, height) {
  const { isBoosting, isBraking } = gameState;
  const hintH = Math.max(52, height * 0.08);
  const hintY = height - hintH;
  const sz = Math.max(15, Math.min(22, width * 0.05));

  ctx.save();

  ctx.fillStyle = "#CC001E";
  ctx.globalAlpha = isBraking ? 0.22 : 0.07;
  ctx.fillRect(0, hintY, width * TOUCH_BRAKE_RATIO, hintH);

  ctx.fillStyle = "#C87D12";
  ctx.globalAlpha = isBoosting ? 0.22 : 0.07;
  ctx.fillRect(
    width * TOUCH_BOOST_RATIO,
    hintY,
    width * (1 - TOUCH_BOOST_RATIO),
    hintH,
  );

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
    this._windState = createWindState();
  }

  reset() {
    this.displayedSpeedKmh = 0;
    this._warningTick = 0;
    this._windState = createWindState();
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

    drawWindStreaks(ctx, gameState, width, height, this._windState);
    drawCentrifugalSlideEffect(ctx, gameState, width, height);
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
    drawRescueBanner(ctx, gameState, width, height);
  }
}

export { HudRenderer };
