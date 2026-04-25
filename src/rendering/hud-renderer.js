import { drawSpeedometer } from "./hud/speedometer.js";
import { drawBatteryBar } from "./hud/battery-bar.js";
import { drawAeroBadge } from "./hud/aero-badge.js";
import { drawLapPanel } from "./hud/lap-panel.js";
import { drawGripWarning } from "./hud/grip-warning.js";
import { drawCurveIndicator } from "./hud/curve-indicator.js";
import { createWindState, drawWindStreaks } from "./hud/wind-streaks.js";
import { drawCentrifugalSlideEffect } from "./hud/centrifugal-slide.js";
import { SPEED_KMH_SCALE } from "../constants/rendering.js";
import { isMobile } from "../utils/platform.js";
const SPEEDOMETER_SCALE_TO_KMH = SPEED_KMH_SCALE;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;
const TOUCH_BRAKE_RATIO = 0.35;
const TOUCH_BOOST_RATIO = 0.65;
const R4_FONT =
  "'Archivo Narrow','Barlow Condensed','Roboto Condensed',sans-serif";


function drawScanlines(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

const BACK_BTN_LABEL = "✕ MENU";
function _backBtnRect(width, height) {
  const isPortrait = height > width;
  const sz = Math.max(10, Math.min(13, width * 0.028));
  const pad = Math.max(6, Math.min(10, width * 0.018));
  const bh = sz + pad * 2;
  // landscape: top-left; portrait: top-right to avoid overlap with input bars
  const bx = isPortrait ? width - Math.round(width * 0.28) - pad : pad;
  const by = pad;
  const bw = Math.round(width * 0.28);
  return { bx, by, bw, bh, sz };
}
function drawBackButton(ctx, width, height, pressed) {
  const { bx, by, bw, bh, sz } = _backBtnRect(width, height);
  ctx.save();
  ctx.globalAlpha = pressed ? 0.85 : 0.55;
  ctx.fillStyle = pressed ? "#CC0000" : "#1a1a1a";
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
  ctx.lineTo(bx + r, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
  ctx.lineTo(bx, by + r);
  ctx.quadraticCurveTo(bx, by, bx + r, by);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pressed ? "#FF4444" : "#555555";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = pressed ? 1.0 : 0.75;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${sz}px ${R4_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(BACK_BTN_LABEL, bx + bw / 2, by + bh / 2);
  ctx.restore();
  return { x: bx, y: by, w: bw, h: bh };
}


function drawInputBars(ctx, gameState, width, height) {
  const { isBoosting, isBraking } = gameState;
  const barW = Math.max(6, Math.min(10, width * 0.015));
  const barH = Math.max(60, Math.min(120, height * 0.18));
  const margin = Math.max(8, Math.min(14, width * 0.022));
  const barY = height - barH - margin;
  const lblSz = Math.max(8, Math.min(11, width * 0.018));

  ctx.save();

  
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
    this._backBtnPressed = false;
    this._backBtnRect = null;
    // instance scoped caches for HUD drawing resources (gradients, bitmaps)
    this._caches = {
      aeroBadgeCache: new Map(),
      gripWarningCache: new Map(),
      windVignetteCache: {},
      centrifugalGradCache: {},
    };
  }
  reset() {
    this.displayedSpeedKmh = 0;
    this._warningTick = 0;
    this._windState = createWindState();
    this._backBtnPressed = false;
    this._backBtnRect = null;
    // clear instance caches
    this._caches.aeroBadgeCache.clear();
    this._caches.gripWarningCache.clear();
    this._caches.windVignetteCache = {};
    this._caches.centrifugalGradCache = {};
  }
  isBackBtnHit(x, y) {
    const r = this._backBtnRect;
    if (!r) return false;
    const ex = r.w * 0.1;
    const ey = r.h * 0.1;
    return x >= r.x - ex && x <= r.x + r.w + ex && y >= r.y - ey && y <= r.y + r.h + ey;
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
    drawWindStreaks(ctx, gameState, width, height, this._windState, dt, this._caches);
    drawCentrifugalSlideEffect(ctx, gameState, width, height, this._caches);
    this._warningTick = drawGripWarning(
      ctx,
      gameState,
      width,
      height,
      this._warningTick,
      this._caches,
    );
    drawCurveIndicator(ctx, gameState, width);
    drawLapPanel(ctx, gameState, width, height);
    drawBatteryBar(ctx, gameState, width, height);
    drawSpeedometer(ctx, this.displayedSpeedKmh, width, height, isPortrait, 0);
    drawAeroBadge(ctx, gameState, width, height, 0, this._caches);
    drawRescueBanner(ctx, gameState, width, height);
    if (isMobile) {
      this._backBtnRect = drawBackButton(ctx, width, height, this._backBtnPressed);
    }
    drawScanlines(ctx, width, height);
  }
}
export { HudRenderer };
