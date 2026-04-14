import { drawRoundedRect } from "../utils/canvas.js";
import {
  AERO_MODES,
  BOOST_FLAME_HEIGHT_MIN,
  BOOST_FLAME_HEIGHT_RANDOM,
  BOOST_FLAME_WIDTH,
  BOOST_FLAME_X_OFFSET,
  CAR_HEIGHT,
  CAR_SLIP_ALPHA_FACTOR,
  CAR_WIDTH,
  CAR_Y_RATIO,
  HALF_RATIO,
  MIN_CAR_ALPHA,
  RENDER_COLORS,
  CAR_HEADING_VISUAL_SCALE,
} from "../constants/index.js";

function computeCarDrawPosition(gameState, width, height) {
  const carY = height * CAR_Y_RATIO;
  let drawX = width * HALF_RATIO + (gameState.lateralOffset || 0);
  let drawY = carY;

  if (!gameState.isGameOver && gameState.isOffTrack) {
    const slip = gameState.currentSlip || 0;
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

  return { drawX, drawY };
}

function drawDustCloud(ctx, gameState, drawX, drawY, carWidth, carHeight) {
  if (
    gameState.isGameOver ||
    !gameState.isOffTrack ||
    gameState.offTrackDustTimer <= 0
  )
    return;

  const dustAlpha = Math.min(0.72, gameState.offTrackDustTimer / 24);
  const sprayWidth = carWidth + 110;

  for (let i = 0; i < 16; i += 1) {
    const px = drawX + (Math.random() - 0.5) * sprayWidth;
    const py = drawY + carHeight * 0.38 + Math.random() * 42;
    const size = 8 + Math.random() * 24;

    ctx.fillStyle =
      Math.random() < 0.5
        ? `rgba(194, 168, 128, ${dustAlpha})`
        : `rgba(131, 124, 112, ${dustAlpha * 0.9})`;

    ctx.beginPath();
    ctx.ellipse(px, py, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (Math.random() < 0.4) {
      const shard = 4 + Math.random() * 9;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * shard, py + Math.sin(angle) * shard);
      ctx.lineTo(
        px + Math.cos(angle + 1.8) * shard * 0.8,
        py + Math.sin(angle + 1.8) * shard * 0.8,
      );
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawCarBody(ctx, gameState, metrics) {
  const { carWidth, carHeight } = metrics;
  const bodyWidth = carWidth * 0.78;
  const bodyHeight = carHeight * 0.9;
  const bodyX = -bodyWidth / 2;
  const bodyY = -bodyHeight / 2;

  const isModeZ = gameState.aeroMode === AERO_MODES.Z;
  const bodyBase = isModeZ ? RENDER_COLORS.modeZ : RENDER_COLORS.red;
  const bodyDark = isModeZ ? RENDER_COLORS.modeZDark : RENDER_COLORS.redDark;

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, carHeight * 0.25, CAR_WIDTH * 0.48, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bodyBase;
  drawRoundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 12);
  ctx.fill();

  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cockpitWidth = bodyWidth * 0.58;
  const cockpitHeight = bodyHeight * 0.28;
  const cockpitY = bodyY + bodyHeight * 0.2;
  const cockpitX = -cockpitWidth / 2;

  drawRoundedRect(ctx, cockpitX, cockpitY, cockpitWidth, cockpitHeight, 7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  drawRoundedRect(
    ctx,
    cockpitX + 3,
    cockpitY + 3,
    cockpitWidth - 6,
    Math.max(3, cockpitHeight * 0.18),
    3,
  );
  ctx.fill();

  const centerStripeWidth = bodyWidth * 0.16;
  drawRoundedRect(
    ctx,
    -centerStripeWidth / 2,
    bodyY + 6,
    centerStripeWidth,
    bodyHeight * 0.64,
    3,
  );
  ctx.fillStyle = "rgba(255, 255, 255, 0.26)";
  ctx.fill();
}

function drawBoostFlame(ctx, gameState, metrics) {
  if (!gameState.isBoosting || gameState.battery <= 0) return;

  const { carWidth, carHeight } = metrics;
  ctx.fillStyle = RENDER_COLORS.boost;
  const flameHeight =
    (BOOST_FLAME_HEIGHT_MIN + Math.random() * BOOST_FLAME_HEIGHT_RANDOM) *
    (carHeight / CAR_HEIGHT);
  const flameWidth = BOOST_FLAME_WIDTH * (carWidth / CAR_WIDTH);
  const flameX = BOOST_FLAME_X_OFFSET * (carWidth / CAR_WIDTH);
  ctx.fillRect(flameX, carHeight / 2, flameWidth, flameHeight);
}

function drawCar(ctx, gameState, track, metrics) {
  const { width, height, carWidth, carHeight } = metrics;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const { drawX, drawY } = computeCarDrawPosition(gameState, width, height);

  drawDustCloud(ctx, gameState, drawX, drawY, carWidth, carHeight);

  ctx.save();
  ctx.translate(drawX, drawY);

  if (!gameState.isGameOver) {
    const slip = gameState.currentSlip || 0;
    ctx.globalAlpha = Math.max(MIN_CAR_ALPHA, 1 - slip * CAR_SLIP_ALPHA_FACTOR);
  }

  const currentCurvature =
    gameState.currentCurvature ?? carTrackInfo.curve ?? 0;
  const CAR_CURVE_ROTATION_FACTOR = 0.08;
  ctx.rotate(
    currentCurvature * CAR_CURVE_ROTATION_FACTOR +
      (gameState.carVisualHeading || 0) * CAR_HEADING_VISUAL_SCALE +
      (gameState.spinRotation || 0),
  );

  drawCarBody(ctx, gameState, { carWidth, carHeight });

  ctx.globalAlpha = 1.0;

  drawBoostFlame(ctx, gameState, { carWidth, carHeight });

  ctx.restore();
}

export { drawCar };
