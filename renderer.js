import { formatTime } from "./utils.js";
import { drawStartScreen, drawGameOverScreen } from "./ui.js";
import { drawTrackPreviewScreen } from "./track-preview.js";
import {
  AERO_MODES,
  BOOST_FLAME_HEIGHT_MIN,
  BOOST_FLAME_HEIGHT_RANDOM,
  BOOST_FLAME_WIDTH,
  BOOST_FLAME_X_OFFSET,
  BORDER_WIDTH,
  CAR_CURVE_ROTATION_FACTOR,
  CAR_HEIGHT,
  CAR_SLIP_ALPHA_FACTOR,
  CAR_WIDTH,
  CAR_Y_RATIO,
  HALF_RATIO,
  MIN_CAR_ALPHA,
  RENDER_COLORS,
  ROAD_SAMPLE_STEP,
  SCREENS,
  SLIP_PENALTY_THRESHOLD,
  STRAIGHT_STRIPE_LENGTH,
  TRACK_TYPES,
  TRACK_WIDTH,
  CURVE_STRIPE_LENGTH,
} from "./constants/index.js";

function fillRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

const SPEEDOMETER_SCALE_TO_KMH = 8;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;

class Renderer {
  constructor(canvas, ctx, statusText) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.statusText = statusText;
    this.displayedSpeedKmh = 0;
  }

  drawSpeedometer(gameState, width, height) {
    const ctx = this.ctx;
    const rawSpeed = Math.max(0, gameState.speed || 0);
    const targetSpeedKmh = Math.min(
      SPEEDOMETER_MAX_KMH,
      rawSpeed * SPEEDOMETER_SCALE_TO_KMH,
    );

    this.displayedSpeedKmh +=
      (targetSpeedKmh - this.displayedSpeedKmh) * SPEEDOMETER_SMOOTHING;

    const shownSpeed = Math.round(this.displayedSpeedKmh);
    const panelWidth = Math.max(136, Math.min(220, width * 0.22));
    const panelHeight = Math.max(72, Math.min(110, height * 0.15));
    const margin = Math.max(10, Math.min(24, width * 0.02));
    const x = width - panelWidth - margin;
    const y = height - panelHeight - margin;

    ctx.save();

    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 8;
    fillRoundedRect(ctx, x, y, panelWidth, panelHeight, 12);
    ctx.fillStyle = "rgba(6, 12, 20, 0.78)";
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const speedFontSize = Math.max(30, Math.min(50, panelHeight * 0.5));
    const labelFontSize = Math.max(10, Math.min(15, panelHeight * 0.2));

    ctx.fillStyle = "#ecf0f1";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${speedFontSize}px Consolas, 'Courier New', monospace`;
    ctx.fillText(`${shownSpeed}`, x + panelWidth - 14, y + panelHeight * 0.52);

    ctx.fillStyle = "rgba(241, 196, 15, 0.95)";
    ctx.font = `700 ${labelFontSize}px sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("KM/H", x + panelWidth - 14, y + panelHeight - 12);

    ctx.restore();
  }

  draw(gameState, track) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const width = canvas.width;
    const height = canvas.height;

    if (gameState.currentScreen === SCREENS.PREVIEW) {
      this.statusText.innerText = "";
      drawTrackPreviewScreen(ctx, width, height, track);
      return;
    }

    if (gameState.currentScreen === SCREENS.START) {
      this.statusText.innerText = "";
      drawStartScreen(ctx, width, height);
      return;
    }

    if (gameState.currentScreen === SCREENS.GAME_OVER) {
      this.statusText.innerText = "";
      drawGameOverScreen(ctx, width, height, gameState.finalTime);
      return;
    }

    const carY = height * CAR_Y_RATIO;
    const carTrackInfo = track.getTrackPoint(gameState.currentZ);
    const cameraX = carTrackInfo.x;

    ctx.fillStyle = RENDER_COLORS.grass;
    ctx.fillRect(0, 0, width, height);

    const halfRoad = TRACK_WIDTH * HALF_RATIO;

    for (let y = 0; y < height; y += ROAD_SAMPLE_STEP) {
      const sliceZ = gameState.currentZ + (carY - y);
      const info = track.getTrackPoint(sliceZ);
      const centerX = width * HALF_RATIO + (info.x - cameraX);

      const left = Math.round(centerX - halfRoad);
      const right = Math.round(centerX + halfRoad);

      const isCurve = info.type === TRACK_TYPES.CURVE;
      const stripeLength = isCurve
        ? CURVE_STRIPE_LENGTH
        : STRAIGHT_STRIPE_LENGTH;
      const checker = Math.floor(sliceZ / stripeLength) % 2 === 0;
      const asphaltColor = isCurve
        ? RENDER_COLORS.asphaltCurve
        : RENDER_COLORS.asphaltStraight;
      const stripeColor = checker
        ? isCurve
          ? RENDER_COLORS.red
          : RENDER_COLORS.white
        : isCurve
          ? RENDER_COLORS.white
          : RENDER_COLORS.red;

      ctx.fillStyle = stripeColor;
      ctx.fillRect(left - BORDER_WIDTH, y, BORDER_WIDTH, ROAD_SAMPLE_STEP);
      ctx.fillRect(right, y, BORDER_WIDTH, ROAD_SAMPLE_STEP);

      ctx.fillStyle = asphaltColor;
      ctx.fillRect(left, y, TRACK_WIDTH, ROAD_SAMPLE_STEP);

      if (info.marker) {
        ctx.fillStyle = RENDER_COLORS.white;
        ctx.fillRect(left, y, TRACK_WIDTH, ROAD_SAMPLE_STEP);
      }
    }

    let drawX = width * HALF_RATIO + (gameState.lateralOffset || 0);
    let drawY = carY;
    const slip = gameState.currentSlip || 0;

    if (!gameState.isGameOver && gameState.isOffTrack) {
      const slipShake = Math.min(1.5, slip * 0.3);
      const inertiaShake = Math.min(
        1.8,
        Math.abs(gameState.lateralVelocity || 0) * 0.04,
      );
      const speedShake = Math.min(1.3, (gameState.speed || 0) / 35);
      const shakeScale = 1 + slipShake + inertiaShake + speedShake;

      drawX += (Math.random() - 0.5) * 12 * shakeScale;
      drawY += (Math.random() - 0.5) * 5 * shakeScale;
    }

    if (
      !gameState.isGameOver &&
      gameState.isOffTrack &&
      gameState.offTrackDustTimer > 0
    ) {
      const dustAlpha = Math.min(0.72, gameState.offTrackDustTimer / 24);
      const sprayWidth = CAR_WIDTH + 110;

      for (let i = 0; i < 16; i += 1) {
        const px = drawX + (Math.random() - 0.5) * sprayWidth;
        const py = drawY + CAR_HEIGHT * 0.38 + Math.random() * 42;
        const size = 8 + Math.random() * 24;

        if (Math.random() < 0.5) {
          ctx.fillStyle = `rgba(194, 168, 128, ${dustAlpha})`;
        } else {
          ctx.fillStyle = `rgba(131, 124, 112, ${dustAlpha * 0.9})`;
        }

        ctx.beginPath();
        ctx.ellipse(px, py, size, size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() < 0.4) {
          const shard = 4 + Math.random() * 9;
          const angle = Math.random() * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(
            px + Math.cos(angle) * shard,
            py + Math.sin(angle) * shard,
          );
          ctx.lineTo(
            px + Math.cos(angle + 1.8) * shard * 0.8,
            py + Math.sin(angle + 1.8) * shard * 0.8,
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    ctx.save();
    ctx.translate(drawX, drawY);

    if (!gameState.isGameOver) {
      ctx.globalAlpha = Math.max(
        MIN_CAR_ALPHA,
        1 - slip * CAR_SLIP_ALPHA_FACTOR,
      );
    }

    ctx.rotate(carTrackInfo.curve * CAR_CURVE_ROTATION_FACTOR);

    const halfHeight = CAR_HEIGHT / 2;
    const bodyWidth = CAR_WIDTH * 0.78;
    const bodyHeight = CAR_HEIGHT * 0.9;
    const bodyX = -bodyWidth / 2;
    const bodyY = -bodyHeight / 2;

    const isModeZ = gameState.aeroMode === AERO_MODES.Z;
    const bodyBase = isModeZ ? RENDER_COLORS.modeZ : RENDER_COLORS.red;
    const bodyDark = isModeZ ? RENDER_COLORS.modeZDark : RENDER_COLORS.redDark;

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, halfHeight * 0.5, CAR_WIDTH * 0.48, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bodyBase;
    fillRoundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 12);
    ctx.fill();

    ctx.strokeStyle = bodyDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const cockpitWidth = bodyWidth * 0.58;
    const cockpitHeight = bodyHeight * 0.28;
    const cockpitY = bodyY + bodyHeight * 0.2;
    const cockpitX = -cockpitWidth / 2;

    fillRoundedRect(ctx, cockpitX, cockpitY, cockpitWidth, cockpitHeight, 7);
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    fillRoundedRect(
      ctx,
      cockpitX + 3,
      cockpitY + 3,
      cockpitWidth - 6,
      Math.max(3, cockpitHeight * 0.18),
      3,
    );
    ctx.fill();

    const centerStripeWidth = bodyWidth * 0.16;
    fillRoundedRect(
      ctx,
      -centerStripeWidth / 2,
      bodyY + 6,
      centerStripeWidth,
      bodyHeight * 0.64,
      3,
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
    ctx.fill();

    ctx.globalAlpha = 1.0;

    if (gameState.isBoosting && gameState.battery > 0) {
      ctx.fillStyle = RENDER_COLORS.boost;
      const flameHeight =
        BOOST_FLAME_HEIGHT_MIN + Math.random() * BOOST_FLAME_HEIGHT_RANDOM;
      ctx.fillRect(
        BOOST_FLAME_X_OFFSET,
        CAR_HEIGHT / 2,
        BOOST_FLAME_WIDTH,
        flameHeight,
      );
    }

    ctx.restore();

    this.drawSpeedometer(gameState, width, height);

    const timeStr = formatTime(gameState.currentTime);
    const alertMsg =
      gameState.currentSlip > SLIP_PENALTY_THRESHOLD
        ? ` | GRIP NO LIMITE (${gameState.currentSlip.toFixed(1)})`
        : "";
    const offTrackMsg = gameState.isOffTrack ? " | OFF-TRACK (GRAMA)" : "";

    this.statusText.innerText = `${timeStr} | Volta: ${gameState.lapCount + 1}/${gameState.targetLaps} | Trecho: ${gameState.currentSegmentIndex}/${gameState.totalSegments}\nModo: ${gameState.aeroMode} | Bateria: ${Math.floor(gameState.battery)}%${alertMsg}${offTrackMsg}`;
  }
}

export { Renderer };
