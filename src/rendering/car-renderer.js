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
  const bw = carWidth * 0.78;
  const bh = carHeight * 0.9;
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
  const { carWidth, carHeight } = metrics;
  const bodyWidth = carWidth * 0.78;
  const bodyHeight = carHeight * 0.9;
  const bodyX = -bodyWidth / 2;
  const bodyY = -bodyHeight / 2;
  const isModeZ = gameState.aeroMode === AERO_MODES.Z;
  const bodyBase = isModeZ ? RENDER_COLORS.modeZ : RENDER_COLORS.red;
  const bodyDark = isModeZ ? RENDER_COLORS.modeZDark : RENDER_COLORS.redDark;

  // ── Projected solid drop-shadow (no blur — hard industrial) ─────────────
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  drawRoundedRect(ctx, bodyX + 6, bodyY + 7, bodyWidth, bodyHeight, 12);
  ctx.fill();

  // ── Ground contact shadow ellipse ────────────────────────────────────────
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  ctx.beginPath();
  ctx.ellipse(0, carHeight * 0.25, CAR_WIDTH * 0.48, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Body — linear gradient for roof curvature / volume ───────────────────
  const bodyGrad = ctx.createLinearGradient(
    bodyX,
    bodyY,
    bodyX + bodyWidth,
    bodyY,
  );
  const highlight = isModeZ ? "rgba(72,112,192,0.85)" : "rgba(255,60,60,0.85)";
  const midColor = isModeZ ? RENDER_COLORS.modeZ : RENDER_COLORS.red;
  const edgeColor = isModeZ ? RENDER_COLORS.modeZDark : RENDER_COLORS.redDark;
  bodyGrad.addColorStop(0, edgeColor);
  bodyGrad.addColorStop(0.22, highlight);
  bodyGrad.addColorStop(0.5, midColor);
  bodyGrad.addColorStop(0.78, highlight);
  bodyGrad.addColorStop(1, edgeColor);
  ctx.fillStyle = bodyGrad;
  drawRoundedRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 12);
  ctx.fill();

  // Outline
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── Panel lines (door / hood cut lines) ─────────────────────────────────
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 1;

  // Horizontal door separator
  const panelLineY = bodyY + bodyHeight * 0.55;
  ctx.beginPath();
  ctx.moveTo(bodyX + 4, panelLineY);
  ctx.lineTo(bodyX + bodyWidth - 4, panelLineY);
  ctx.stroke();

  // Vertical hood / bonnet split
  ctx.beginPath();
  ctx.moveTo(0, bodyY + 4);
  ctx.lineTo(0, bodyY + bodyHeight * 0.48);
  ctx.stroke();

  // ── Cockpit / windshield ─────────────────────────────────────────────────
  ctx.lineWidth = 2;
  const cockpitWidth = bodyWidth * 0.58;
  const cockpitHeight = bodyHeight * 0.28;
  const cockpitY = bodyY + bodyHeight * 0.2;
  const cockpitX = -cockpitWidth / 2;
  drawRoundedRect(ctx, cockpitX, cockpitY, cockpitWidth, cockpitHeight, 7);
  ctx.fillStyle = "#000000";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Diagonal glare streak (simulate light reflection)
  ctx.save();
  ctx.beginPath();
  ctx.rect(cockpitX, cockpitY, cockpitWidth, cockpitHeight);
  ctx.clip();
  ctx.strokeStyle = "rgba(180,220,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cockpitX + cockpitWidth * 0.15, cockpitY + 2);
  ctx.lineTo(cockpitX + cockpitWidth * 0.45, cockpitY + cockpitHeight - 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cockpitX + cockpitWidth * 0.25, cockpitY + 2);
  ctx.lineTo(cockpitX + cockpitWidth * 0.55, cockpitY + cockpitHeight - 2);
  ctx.stroke();
  ctx.restore();

  // Top windshield reflection strip
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

  // ── Centre stripe ────────────────────────────────────────────────────────
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

  const speed = gameState.speed || 0;
  const roadAngle = Math.atan2(carTrackInfo.yaw ?? 0, Z_RESOLUTION);
  const totalAngle =
    roadAngle +
    (gameState.carVisualHeading || 0) * CAR_HEADING_VISUAL_SCALE +
    (gameState.spinRotation || 0);

  // Motion trail (>250 km/h)
  if (speed >= TRAIL_SPEED_THRESHOLD) {
    _pushTrail(drawX, drawY, totalAngle);
    _drawMotionTrail(ctx, carWidth, carHeight);
  } else if (_trail.length > 0) {
    _trail.length = 0;
  }

  drawDustCloud(ctx, gameState, drawX, drawY, carWidth, carHeight);

  // Water spray (>100 km/h)
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
