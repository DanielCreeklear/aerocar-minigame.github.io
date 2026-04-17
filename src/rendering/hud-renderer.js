import { drawSpeedometer } from "./hud/speedometer.js";
import { drawBatteryBar } from "./hud/battery-bar.js";
import { drawAeroBadge } from "./hud/aero-badge.js";
import { drawLapPanel } from "./hud/lap-panel.js";
import { drawGripWarning } from "./hud/grip-warning.js";
import { drawCurveIndicator } from "./hud/curve-indicator.js";
import { createWindState, drawWindStreaks } from "./hud/wind-streaks.js";
import { drawCentrifugalSlideEffect } from "./hud/centrifugal-slide.js";
import { SPEED_KMH_SCALE } from "../constants/rendering.js";
const SPEEDOMETER_SCALE_TO_KMH = SPEED_KMH_SCALE;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;
const TOUCH_BRAKE_RATIO = 0.35;
const TOUCH_BOOST_RATIO = 0.65;
const R4_FONT =
  "'Archivo Narrow','Barlow Condensed','Roboto Condensed',sans-serif";

// --- R4 Scanline overlay (CRT effect) ---
function drawScanlines(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = "#000000";
  for (let y = 0; y < height; y += 2) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

// --- BRK / BST input bars (bottom corners) ---
function drawInputBars(ctx, gameState, width, height) {
  const { isBoosting, isBraking } = gameState;
  const barW = Math.max(6, Math.min(10, width * 0.015));
  const barH = Math.max(60, Math.min(120, height * 0.18));
  const margin = Math.max(8, Math.min(14, width * 0.022));
  const barY = height - barH - margin;
  const lblSz = Math.max(8, Math.min(11, width * 0.018));

  ctx.save();

  // BRK bar (left)
  const brkX = margin;
  ctx.fillStyle = "rgba(40,0,0,0.60)";
  ctx.fillRect(brkX, barY, barW, barH);
  if (isBraking) {
    ctx.fillStyle = "#FF0000";
    ctx.shadowColor = "#FF0000";
    ctx.shadowBlur = 8;
    ctx.fillRect(brkX, barY, barW, barH);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "rgba(255,0,0,0.25)";
    ctx.fillRect(brkX, barY, barW, barH);
  }
  ctx.font = `italic bold ${lblSz}px ${R4_FONT}`;
  ctx.fillStyle = isBraking ? "#FF0000" : "rgba(255,0,0,0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("BRK", brkX + barW / 2, barY + barH + 3);

  // BST bar (right)
  const bstX = width - margin - barW;
  ctx.fillStyle = "rgba(0,20,40,0.60)";
  ctx.fillRect(bstX, barY, barW, barH);
  if (isBoosting) {
    ctx.fillStyle = "#FDB80B";
    ctx.shadowColor = "#FDB80B";
    ctx.shadowBlur = 8;
    ctx.fillRect(bstX, barY, barW, barH);
    ctx.shadowBlur = 0;
  } else {
    ctx.fillStyle = "rgba(253,184,11,0.25)";
    ctx.fillRect(bstX, barY, barW, barH);
  }
  ctx.fillStyle = isBoosting ? "#FDB80B" : "rgba(253,184,11,0.45)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("BST", bstX + barW / 2, barY + barH + 3);

  ctx.restore();
}
const RESCUE_FONT = R4_FONT;
function drawRescueBanner(ctx, gameState, width, height) {
  const timer = gameState.rescueFlashTimer || 0;
  if (timer <= 0) return;
  const alpha = Math.min(1, timer / 1.5);
  ctx.save();
  if (timer > 10.85) {
    ctx.globalAlpha = 0.35 * Math.min(1, (timer - 10.85) / 0.1);
    ctx.fillStyle = "#E60000";
    ctx.fillRect(0, 0, width, height);
  }
  const bh = Math.max(48, height * 0.1);
  const by = height * 0.38;
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = "#1C1C1C";
  ctx.fillRect(0, by, width, bh);
  ctx.strokeStyle = "#E60000";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, by, width, bh);
  const sz = Math.max(18, Math.min(32, width * 0.055));
  ctx.globalAlpha = alpha;
  ctx.font = `italic bold ${sz}px ${RESCUE_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tx = width * 0.5;
  const ty = by + bh * 0.5;
  const msg = "!!  PENALIDADE — RESGATE  !!";
  // Chromatic aberration: offset R and B channels
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255,0,0,0.55)";
  ctx.fillText(msg, tx - 2, ty);
  ctx.fillStyle = "rgba(0,180,255,0.55)";
  ctx.fillText(msg, tx + 2, ty);
  ctx.fillStyle = "#FF2244";
  ctx.fillText(msg, tx, ty);
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
  draw(ctx, gameState, width, height, dt = 1 / 60) {
    const rawSpeed = Math.max(0, gameState.speed || 0);
    const targetSpeedKmh = Math.min(
      SPEEDOMETER_MAX_KMH,
      rawSpeed * SPEEDOMETER_SCALE_TO_KMH,
    );
    this.displayedSpeedKmh +=
      (targetSpeedKmh - this.displayedSpeedKmh) * SPEEDOMETER_SMOOTHING;
    const isPortrait = height > width;
    if (isPortrait) {
      drawInputBars(ctx, gameState, width, height);
    }
    drawWindStreaks(ctx, gameState, width, height, this._windState, dt);
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
    drawSpeedometer(ctx, this.displayedSpeedKmh, width, height, isPortrait, 0);
    drawAeroBadge(ctx, gameState, width, height, 0);
    drawRescueBanner(ctx, gameState, width, height);
    drawScanlines(ctx, width, height);
  }
}
export { HudRenderer };
