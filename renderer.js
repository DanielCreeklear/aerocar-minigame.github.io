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
  getViewportProfile,
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

function getRenderMetrics(width, height) {
  const profile = getViewportProfile(width, height);

  if (!profile.isPortrait) {
    return {
      borderWidth: BORDER_WIDTH,
      carHeight: CAR_HEIGHT,
      carWidth: CAR_WIDTH,
      roadSampleStep: ROAD_SAMPLE_STEP,
      trackWidth: TRACK_WIDTH,
      speedometer: {
        widthRatio: 0.22,
        heightRatio: 0.15,
        minWidth: 136,
        maxWidth: 220,
        minHeight: 72,
        maxHeight: 110,
        minMargin: 10,
        maxMargin: 24,
      },
    };
  }

  return {
    borderWidth: Math.max(12, Math.min(BORDER_WIDTH, width * 0.045)),
    carHeight: Math.max(78, Math.min(CAR_HEIGHT, height * 0.14)),
    carWidth: Math.max(38, Math.min(CAR_WIDTH, width * 0.12)),
    roadSampleStep: profile.isCompactWidth ? 4 : ROAD_SAMPLE_STEP,
    trackWidth: Math.min(TRACK_WIDTH, width * 0.86),
    speedometer: {
      widthRatio: 0.18,
      heightRatio: 0.11,
      minWidth: 110,
      maxWidth: 180,
      minHeight: 58,
      maxHeight: 90,
      minMargin: 8,
      maxMargin: 16,
    },
  };
}

class Renderer {
  constructor(canvas, ctx, statusText) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.statusText = statusText;
    this.displayedSpeedKmh = 0;
  }

  drawSpeedometer(gameState, width, height, speedometerMetrics) {
    const ctx = this.ctx;
    const rawSpeed = Math.max(0, gameState.speed || 0);
    const targetSpeedKmh = Math.min(
      SPEEDOMETER_MAX_KMH,
      rawSpeed * SPEEDOMETER_SCALE_TO_KMH,
    );

    this.displayedSpeedKmh +=
      (targetSpeedKmh - this.displayedSpeedKmh) * SPEEDOMETER_SMOOTHING;

    const shownSpeed = Math.round(this.displayedSpeedKmh);
    const panelWidth = Math.max(
      speedometerMetrics.minWidth,
      Math.min(
        speedometerMetrics.maxWidth,
        width * speedometerMetrics.widthRatio,
      ),
    );
    const panelHeight = Math.max(
      speedometerMetrics.minHeight,
      Math.min(
        speedometerMetrics.maxHeight,
        height * speedometerMetrics.heightRatio,
      ),
    );
    const margin = Math.max(
      speedometerMetrics.minMargin,
      Math.min(speedometerMetrics.maxMargin, width * 0.02),
    );
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

  drawBatteryHUD(gameState, width, height) {
    const ctx = this.ctx;
    const battery = Math.max(0, Math.min(100, gameState.battery || 0));
    const isBoosting = gameState.isBoosting;
    const isBraking = gameState.isBraking;

    const barWidth = Math.max(80, Math.min(160, width * 0.18));
    const barHeight = Math.max(10, Math.min(16, height * 0.022));
    const margin = Math.max(8, Math.min(18, width * 0.02));
    const x = margin;
    const y = margin;
    const radius = barHeight * 0.45;

    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    fillRoundedRect(ctx, x - 2, y - 2, barWidth + 4, barHeight + 4, radius + 2);
    ctx.fillStyle = "rgba(6, 12, 20, 0.75)";
    ctx.fill();
    ctx.shadowBlur = 0;

    const fillW = (battery / 100) * barWidth;
    let barColor;
    if (isBraking && !isBoosting) {
      barColor = "#2ecc71";
    } else if (isBoosting) {
      barColor = battery < 20 ? "#e74c3c" : "#f1c40f";
    } else {
      barColor = battery < 25 ? "#e74c3c" : battery < 50 ? "#f39c12" : "#2ecc71";
    }

    if (fillW > 0) {
      fillRoundedRect(ctx, x, y, fillW, barHeight, radius);
      ctx.fillStyle = barColor;
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    fillRoundedRect(ctx, x, y, barWidth, barHeight, radius);
    ctx.stroke();

    const labelSize = Math.max(9, Math.min(12, barHeight * 0.8));
    ctx.fillStyle = "rgba(236,240,241,0.92)";
    ctx.font = `700 ${labelSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `ERS ${Math.floor(battery)}%${isBraking && !isBoosting ? " +" : ""}`,
      x,
      y + barHeight + 3,
    );

    ctx.restore();
  }

  drawModeButton(gameState, width, height) {
    const ctx = this.ctx;
    const { aeroMode } = gameState;
    const isX = aeroMode === "X";

    const btnW = Math.max(70, Math.min(120, width * 0.13));
    const btnH = Math.max(28, Math.min(48, height * 0.065));
    const margin = Math.max(8, Math.min(18, width * 0.02));
    const x = width - btnW - margin;
    const y = margin;
    const radius = btnH * 0.35;

    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 8;
    fillRoundedRect(ctx, x, y, btnW, btnH, radius);
    ctx.fillStyle = isX
      ? "rgba(231, 76, 60, 0.82)"
      : "rgba(52, 152, 219, 0.82)";
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isX
      ? "rgba(255, 180, 170, 0.7)"
      : "rgba(141, 206, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fontSize = Math.max(11, Math.min(16, btnH * 0.42));
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      isX ? "MODO X" : "MODO Z",
      x + btnW * 0.5,
      y + btnH * 0.5,
    );

    ctx.restore();
  }

  draw(gameState, track) {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const renderMetrics = getRenderMetrics(width, height);

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
    const carTrackInfo =
      gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
    const cameraX = carTrackInfo.x;

    ctx.fillStyle = RENDER_COLORS.grass;
    ctx.fillRect(0, 0, width, height);

    const halfRoad = renderMetrics.trackWidth * HALF_RATIO;

    for (let y = 0; y < height; y += renderMetrics.roadSampleStep) {
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
      ctx.fillRect(
        left - renderMetrics.borderWidth,
        y,
        renderMetrics.borderWidth,
        renderMetrics.roadSampleStep,
      );
      ctx.fillRect(
        right,
        y,
        renderMetrics.borderWidth,
        renderMetrics.roadSampleStep,
      );

      ctx.fillStyle = asphaltColor;
      ctx.fillRect(
        left,
        y,
        renderMetrics.trackWidth,
        renderMetrics.roadSampleStep,
      );

      if (info.marker) {
        ctx.fillStyle = RENDER_COLORS.white;
        ctx.fillRect(
          left,
          y,
          renderMetrics.trackWidth,
          renderMetrics.roadSampleStep,
        );
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
      const sprayWidth = renderMetrics.carWidth + 110;

      for (let i = 0; i < 16; i += 1) {
        const px = drawX + (Math.random() - 0.5) * sprayWidth;
        const py = drawY + renderMetrics.carHeight * 0.38 + Math.random() * 42;
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

    const currentCurvature =
      gameState.currentCurvature ?? carTrackInfo.curve ?? 0;
    ctx.rotate(currentCurvature * CAR_CURVE_ROTATION_FACTOR);

    const halfHeight = renderMetrics.carHeight / 2;
    const bodyWidth = renderMetrics.carWidth * 0.78;
    const bodyHeight = renderMetrics.carHeight * 0.9;
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
        (BOOST_FLAME_HEIGHT_MIN + Math.random() * BOOST_FLAME_HEIGHT_RANDOM) *
        (renderMetrics.carHeight / CAR_HEIGHT);
      const flameWidth =
        BOOST_FLAME_WIDTH * (renderMetrics.carWidth / CAR_WIDTH);
      const flameX =
        BOOST_FLAME_X_OFFSET * (renderMetrics.carWidth / CAR_WIDTH);
      ctx.fillRect(
        flameX,
        renderMetrics.carHeight / 2,
        flameWidth,
        flameHeight,
      );
    }

    ctx.restore();

    this.drawSpeedometer(gameState, width, height, renderMetrics.speedometer);
    this.drawBatteryHUD(gameState, width, height);
    this.drawModeButton(gameState, width, height);

    const timeStr = formatTime(gameState.currentTime);
    const alertMsg =
      gameState.currentSlip > SLIP_PENALTY_THRESHOLD
        ? ` | GRIP NO LIMITE (${gameState.currentSlip.toFixed(1)})`
        : "";
    const offTrackMsg = gameState.isOffTrack ? " | OFF-TRACK (GRAMA)" : "";
    const brakeMsg = gameState.isBraking ? " | FREIO" : "";

    this.statusText.innerText = `${timeStr} | Volta: ${gameState.lapCount + 1}/${gameState.targetLaps} | Trecho: ${gameState.currentSegmentIndex}/${gameState.totalSegments}\nModo: ${gameState.aeroMode} | Bateria: ${Math.floor(gameState.battery)}%${brakeMsg}${alertMsg}${offTrackMsg}`;
  }
}

export { Renderer };
