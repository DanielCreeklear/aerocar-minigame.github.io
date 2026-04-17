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
  LATERAL_RENDER_SCALE,
  MIN_CAR_ALPHA,
  RENDER_COLORS,
  CAR_HEADING_VISUAL_SCALE,
  Z_RESOLUTION,
} from "../constants/index.js";

// ─── Motion trail ring buffer ────────────────────────────────────────────────
const TRAIL_MAX = 10;
const TRAIL_SPEED_THRESHOLD = 250 / 17; // ~14.7 game-units  (250 km/h)
const SPRAY_SPEED_THRESHOLD = 100 / 17; //  ~5.9 game-units  (100 km/h)
const _trail = [];

function _pushTrail(x, y, angle) {
  _trail.push({ x, y, angle });
  if (_trail.length > TRAIL_MAX) _trail.shift();
}

function _drawMotionTrail(ctx, carWidth, carHeight) {
  const bw = carWidth * 0.72;
  const bh = carHeight * 0.88;
  for (let i = 0; i < _trail.length - 1; i++) {
    const t = _trail[i];
    const alpha = ((i + 1) / _trail.length) * 0.055;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
}

function _drawSpray(ctx, drawX, drawY, carWidth, carHeight) {
  for (let i = 0; i < 6; i++) {
    const px = drawX + (Math.random() - 0.5) * carWidth * 0.6;
    const py = drawY + carHeight * 0.42 + Math.random() * 18;
    const w = 2 + Math.random() * 4;
    const h = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(160,190,220,${0.18 + Math.random() * 0.18})`;
    ctx.fillRect(Math.round(px), Math.round(py), Math.ceil(w), Math.ceil(h));
  }
}
function computeCarDrawPosition(gameState, width, height) {
  const carY = height * CAR_Y_RATIO;
  let drawX =
    width * HALF_RATIO + (gameState.lateralOffset || 0) * LATERAL_RENDER_SCALE;
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
        ? `rgba(255, 255, 255, ${dustAlpha})`
        : `rgba(255, 215, 0, ${dustAlpha * 0.85})`;
    ctx.globalAlpha = 0.7;
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
    ctx.globalAlpha = 1.0;
  }
}
function drawCarBody(ctx, gameState, metrics) {
  const { carWidth: w, carHeight: h } = metrics;
  const isModeZ = gameState.aeroMode === AERO_MODES.Z;
  const bodyColor = isModeZ ? RENDER_COLORS.modeZ : RENDER_COLORS.red;
  const accentColor = isModeZ ? RENDER_COLORS.modeZLight : "#ffffff";

  const bodyW = w * 0.72;
  const bodyH = h * 0.88;

  // ── Ground shadow ellipse ────────────────────────────────────────────────
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.28, w * 0.46, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Body ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 4);
  ctx.fill();

  // ── Accent stripe (horizontal band across centre) ────────────────────────
  const stripeH = bodyH * 0.25;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(-bodyW * 0.35, -stripeH / 2, bodyW * 0.7, stripeH, 2);
  ctx.fill();

  // ── Front wing ───────────────────────────────────────────────────────────
  const wingW = w * 0.9;
  const wingH = h * 0.07;
  ctx.fillStyle = accentColor;
  ctx.fillRect(-wingW / 2, -bodyH / 2 - wingH, wingW, wingH);

  // ── Rear wing ────────────────────────────────────────────────────────────
  ctx.fillStyle = bodyColor;
  ctx.fillRect((-wingW / 2) * 0.85, bodyH / 2, wingW * 0.85, wingH);

  // ── Wheels ───────────────────────────────────────────────────────────────
  const wheelW = w * 0.2;
  const wheelH = h * 0.22;
  const wOffX = bodyW * 0.38;
  const wOffY = bodyH * 0.28;
  ctx.fillStyle = "#1A1A1A";
  for (const [wx, wy] of [
    [-wOffX, -wOffY],
    [wOffX, -wOffY],
    [-wOffX, wOffY],
    [wOffX, wOffY],
  ]) {
    ctx.beginPath();
    ctx.roundRect(wx - wheelW / 2, wy - wheelH / 2, wheelW, wheelH, 2);
    ctx.fill();
  }

  // ── Cockpit (player identifier) ──────────────────────────────────────────
  const cpW = bodyW * 0.38;
  const cpH = bodyH * 0.22;
  const cpX = -cpW / 2;
  const cpY = -bodyH / 2 + bodyH * 0.18;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(cpX, cpY, cpW, cpH, 3);
  ctx.fill();
  // Diagonal glare
  ctx.save();
  ctx.beginPath();
  ctx.rect(cpX, cpY, cpW, cpH);
  ctx.clip();
  ctx.strokeStyle = "rgba(180,220,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cpX + cpW * 0.15, cpY + 2);
  ctx.lineTo(cpX + cpW * 0.55, cpY + cpH - 2);
  ctx.stroke();
  ctx.restore();
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

  const speed = gameState.speed || 0;
  const roadAngle = Math.atan2(carTrackInfo.yaw ?? 0, Z_RESOLUTION);
  const totalAngle =
    roadAngle +
    (gameState.carVisualHeading || 0) * CAR_HEADING_VISUAL_SCALE +
    (gameState.spinRotation || 0);

  if (speed >= TRAIL_SPEED_THRESHOLD) {
    _pushTrail(drawX, drawY, totalAngle);
    _drawMotionTrail(ctx, carWidth, carHeight);
  } else if (_trail.length > 0) {
    _trail.length = 0;
  }

  drawDustCloud(ctx, gameState, drawX, drawY, carWidth, carHeight);

  if (speed >= SPRAY_SPEED_THRESHOLD) {
    _drawSpray(ctx, drawX, drawY, carWidth, carHeight);
  }

  ctx.save();
  ctx.translate(drawX, drawY);
  if (!gameState.isGameOver) {
    const slip = gameState.currentSlip || 0;
    ctx.globalAlpha = Math.max(MIN_CAR_ALPHA, 1 - slip * CAR_SLIP_ALPHA_FACTOR);
  }
  ctx.rotate(totalAngle);
  drawCarBody(ctx, gameState, { carWidth, carHeight });
  ctx.globalAlpha = 1.0;
  drawBoostFlame(ctx, gameState, { carWidth, carHeight });
  ctx.restore();
}
export { drawCar };
