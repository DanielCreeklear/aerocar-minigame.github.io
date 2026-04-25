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


const TRAIL_MAX = 10;
const TRAIL_SPEED_THRESHOLD = 250 / 17; 
const SPRAY_SPEED_THRESHOLD = 100 / 17; 



function createTrailState() {
  return { buf: new Array(TRAIL_MAX), head: 0, len: 0 };
}

function _pushTrail(trailState, x, y, angle) {
  const buf = trailState.buf;
  let head = trailState.head;
  let len = trailState.len;
  let slot = buf[head];
  if (!slot) {
    slot = { x: 0, y: 0, angle: 0 };
    buf[head] = slot;
  }
  slot.x = x;
  slot.y = y;
  slot.angle = angle;
  head = (head + 1) % TRAIL_MAX;
  if (len < TRAIL_MAX) len++;
  trailState.head = head;
  trailState.len = len;
}

function _drawMotionTrail(ctx, trailState, carWidth, carHeight) {
  const bw = carWidth * 0.72;
  const bh = carHeight * 0.88;
  const len = trailState.len;
  if (len <= 0) return;
  const head = trailState.head;
  const buf = trailState.buf;
  for (let idx = 0; idx < len - 1; idx++) {
    const i = (head + TRAIL_MAX - len + idx) % TRAIL_MAX;
    const t = buf[i];
    if (!t) continue;
    const alpha = ((idx + 1) / len) * 0.055;
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
  return { drawX: Math.round(drawX), drawY: Math.round(drawY) };
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

  
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.28, w * 0.46, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 4);
  ctx.fill();

  
  const stripeH = bodyH * 0.25;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(-bodyW * 0.35, -stripeH / 2, bodyW * 0.7, stripeH, 2);
  ctx.fill();

  
  const wingW = w * 0.9;
  const wingH = h * 0.07;
  ctx.fillStyle = accentColor;
  ctx.fillRect(-wingW / 2, -bodyH / 2 - wingH, wingW, wingH);

  
  ctx.fillStyle = bodyColor;
  ctx.fillRect((-wingW / 2) * 0.85, bodyH / 2, wingW * 0.85, wingH);

  
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

  
  const cpW = bodyW * 0.38;
  const cpH = bodyH * 0.22;
  const cpX = -cpW / 2;
  const cpY = -bodyH / 2 + bodyH * 0.18;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect(cpX, cpY, cpW, cpH, 3);
  ctx.fill();
  
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
function drawBoostFlame(ctx, gameState, metrics, caches = null) {
  if (!gameState.isBoosting || gameState.battery <= 0) return;
  const { carWidth, carHeight } = metrics;
  const bodyW = carWidth * 0.72;
  const bodyH = carHeight * 0.88;
  const glowRadius = Math.round(bodyW * 0.62 + Math.random() * bodyW * 0.1);
  
  let gcache = null;
  if (caches && caches.boostGradCache) gcache = caches.boostGradCache;
  else {
    if (!drawBoostFlame._gradCache) drawBoostFlame._gradCache = {};
    gcache = drawBoostFlame._gradCache;
  }
  const cacheKey = `${glowRadius}@${ctx.canvas.width}x${ctx.canvas.height}`;
  let grad = gcache[cacheKey];
  if (!grad) {
    grad = ctx.createRadialGradient(0, 0, bodyW * 0.1, 0, 0, glowRadius);
    grad.addColorStop(0, `rgba(0,220,255,0.22)`);
    grad.addColorStop(0.5, `rgba(0,140,255,0.14)`);
    grad.addColorStop(1, `rgba(0,80,200,0)`);
    gcache[cacheKey] = grad;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, glowRadius, bodyH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  const arcCount = 3 + Math.floor(Math.random() * 3);
  const rearY = bodyH / 2;
  for (let i = 0; i < arcCount; i++) {
    const sx = (Math.random() - 0.5) * bodyW * 0.7;
    const len = 6 + Math.random() * 10;
    ctx.strokeStyle = `rgba(${100 + Math.floor(Math.random() * 155)},230,255,${0.55 + Math.random() * 0.45})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, rearY);
    ctx.lineTo(sx + (Math.random() - 0.5) * 8, rearY + len * 0.5);
    ctx.lineTo(sx + (Math.random() - 0.5) * 6, rearY + len);
    ctx.stroke();
  }
  ctx.restore();
}
function drawCar(ctx, gameState, track, metrics, trailState, caches = null) {
  const { width, height, carWidth, carHeight } = metrics;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const { drawX, drawY } = computeCarDrawPosition(gameState, width, height);

  const speed = gameState.speed || 0;
  
  
  
  const roadAngle = Math.atan2(carTrackInfo.yaw ?? 0, Z_RESOLUTION);
  const visualHeading = (gameState.carVisualHeading || 0) * CAR_HEADING_VISUAL_SCALE;
  const steerFactor = Math.min(1, Math.abs(gameState.steerInput || 0) * 1.8);
  const playerInfluence = 0.25 + 0.75 * steerFactor; 
  const totalAngle = roadAngle + visualHeading * playerInfluence + (gameState.spinRotation || 0);

  
  
  
  if (!trailState) {
    if (!drawCar._defaultTrail) drawCar._defaultTrail = createTrailState();
    trailState = drawCar._defaultTrail;
  }
  if (speed >= TRAIL_SPEED_THRESHOLD) {
    _pushTrail(trailState, drawX, drawY, totalAngle);
    _drawMotionTrail(ctx, trailState, carWidth, carHeight);
  } else if ((trailState.buf && trailState.buf.length > 0) || trailState.len > 0) {
    trailState.buf.length = 0;
    trailState.head = 0;
    trailState.len = 0;
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
  drawBoostFlame(ctx, gameState, { carWidth, carHeight }, caches);
  ctx.restore();
}
export { drawCar, computeCarDrawPosition, createTrailState };
