import { SPEED_KMH_SCALE } from "../../constants/rendering.js";
import { Z_RESOLUTION } from "../../constants/track.js";

const EFFECT_SPEED_MIN = 220;
const EFFECT_SPEED_MAX = 375;

const RAMP_UP_RATE = 0.04;
const RAMP_DOWN_RATE = 0.17;

const STREAK_COUNT = 150;
const STREAK_MIN_LEN_RATIO = 0.02;
const STREAK_MAX_LEN_RATIO = 0.09;
const STREAK_BASE_VEL = 0.022;
const WIND_VERTICAL_RATIO = 0.52;
const WIND_TURBULENCE_RATIO = 0.32;

const COLOR_NEAR = "rgba(220, 235, 255,";
const COLOR_FAR = "rgba(160, 195, 255,";

function _initStreak(streak, width, height, diag, stagger) {
  const spawnPad = diag * 0.18;
  streak.x = (Math.random() - 0.5) * (width + spawnPad * 2);
  streak.y = stagger
    ? (Math.random() - 0.5) * (height + spawnPad * 2)
    : -height * 0.5 - Math.random() * spawnPad;
  streak.len =
    (STREAK_MIN_LEN_RATIO +
      Math.random() * (STREAK_MAX_LEN_RATIO - STREAK_MIN_LEN_RATIO)) *
    diag;
  streak.width = 0.8 + Math.random() * 1.8;
  streak.baseAlpha = 0.5 + Math.random() * 0.45;
  streak.drift = 0.7 + Math.random() * 0.9;
  streak.slant = (Math.random() - 0.5) * 1.5;
  streak.phase = Math.random() * Math.PI * 2;
}

function createWindState() {
  return {
    streaks: null,
    intensity: 0,
    tick: 0,
  };
}

function drawWindStreaks(ctx, gameState, width, height, state, dt = 1 / 60) {
  const rawSpeed = gameState.speed || 0;
  const speedKmh = rawSpeed * SPEED_KMH_SCALE;

  const targetIntensity =
    speedKmh <= EFFECT_SPEED_MIN
      ? 0
      : Math.min(
          1,
          (speedKmh - EFFECT_SPEED_MIN) / (EFFECT_SPEED_MAX - EFFECT_SPEED_MIN),
        );

  const rate =
    targetIntensity >= state.intensity ? RAMP_UP_RATE : RAMP_DOWN_RATE;
  state.intensity += (targetIntensity - state.intensity) * rate * dt * 60;

  if (state.intensity < 0.01) {
    state.intensity = 0;
    return;
  }

  const diag = Math.hypot(width, height);

  const tp = gameState.currentTrackPoint;
  const windAngle = Math.atan2(tp?.yaw ?? 0, Z_RESOLUTION);

  if (!state.streaks) {
    state.streaks = Array.from({ length: STREAK_COUNT }, () => {
      const s = {};
      _initStreak(s, width, height, diag, true);
      return s;
    });
  }

  const vel = STREAK_BASE_VEL * diag * state.intensity;
  const velY = vel * WIND_VERTICAL_RATIO;
  const spawnPad = diag * 0.22;
  state.tick += dt * 60;

  _updateStreakPositions(
    state.streaks,
    vel,
    velY,
    spawnPad,
    width,
    height,
    diag,
    state.tick,
  );

  ctx.save();
  ctx.translate(width * 0.5, height * 0.5);
  ctx.rotate(windAngle);
  ctx.translate(-width * 0.5, -height * 0.5);
  _renderStreakLines(ctx, state, velY, width, height);
  ctx.restore();

  if (state.intensity > 0.25) {
    _renderVignette(ctx, state.intensity, width, height, diag);
  }
}

function _updateStreakPositions(
  streaks,
  vel,
  velY,
  spawnPad,
  width,
  height,
  diag,
  tick,
) {
  for (let i = 0; i < STREAK_COUNT; i++) {
    const sk = streaks[i];
    const step = sk.drift * (0.7 + sk.width * 0.3);
    const flutter = Math.sin(tick * 0.08 + sk.phase) * vel * 0.06;
    sk.x += (sk.slant * vel * WIND_TURBULENCE_RATIO + flutter) * step;
    sk.y += velY * step;

    if (
      sk.y - sk.len > height * 0.5 + spawnPad ||
      sk.x < -width * 0.5 - spawnPad ||
      sk.x > width * 0.5 + spawnPad
    ) {
      _initStreak(sk, width, height, diag, false);
    }
  }
}

function _renderStreakLines(ctx, state, velY, width, height) {
  ctx.save();
  ctx.lineCap = "round";

  const streaks = state.streaks;
  for (let i = 0; i < STREAK_COUNT; i++) {
    const sk = streaks[i];

    const lineDx = sk.slant * velY * WIND_TURBULENCE_RATIO;
    const lineDy = velY;
    const lineMag = Math.hypot(lineDx, lineDy) || 1;
    const ux = lineDx / lineMag;
    const uy = lineDy / lineMag;

    const x2 = width * 0.5 + sk.x;
    const y2 = height * 0.5 + sk.y;
    const x1 = x2 - ux * sk.len;
    const y1 = y2 - uy * sk.len;

    const edgeX = 1 - Math.min(1, Math.abs(sk.x) / (width * 0.62));
    const edgeY = 1 - Math.min(1, Math.abs(sk.y) / (height * 0.62));
    const edgeFade = Math.max(0, Math.min(1, edgeX * edgeY));
    const alpha = sk.baseAlpha * state.intensity * (0.35 + 0.65 * edgeFade);

    if (alpha <= 0) continue;

    const color = edgeFade > 0.5 ? COLOR_NEAR : COLOR_FAR;
    ctx.lineWidth = sk.width;
    ctx.strokeStyle = `${color} ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function _renderVignette(ctx, intensity, width, height, diag) {
  const vigAlpha = (intensity - 0.25) * 0.18;
  const cx = width * 0.5;
  const cy = height * 0.5;
  const grad = ctx.createRadialGradient(
    cx,
    cy,
    diag * 0.25,
    cx,
    cy,
    diag * 0.72,
  );
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,5,18,${vigAlpha.toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

export { createWindState, drawWindStreaks };
