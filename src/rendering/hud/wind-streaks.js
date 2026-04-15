const SPEED_KMH_SCALE = 17;
const EFFECT_SPEED_MIN = 200;
const EFFECT_SPEED_MAX = 340;

const RAMP_UP_RATE   = 0.04;
const RAMP_DOWN_RATE = 0.07;

const STREAK_COUNT = 180;
const STREAK_MIN_LEN_RATIO = 0.04;
const STREAK_MAX_LEN_RATIO = 0.18;
const STREAK_SPAWN_R_MIN = 0.30;   // born near outer ring
const STREAK_SPAWN_R_MAX = 0.82;   // up to screen edge
const STREAK_DEAD_R = 0.04;        // die when head reaches near-center
const STREAK_BASE_VEL = 0.022;

const COLOR_NEAR = "rgba(220, 235, 255,";
const COLOR_FAR  = "rgba(160, 195, 255,";

// All streaks move INWARD toward the vanishing point (horizon)
function _initStreak(streak, diag, stagger) {
  streak.angle = Math.random() * Math.PI * 2;
  // Head starts somewhere in the outer ring; stagger spreads them across full range on first init
  const rMin = stagger ? STREAK_DEAD_R : STREAK_SPAWN_R_MIN;
  const rMax = STREAK_SPAWN_R_MAX;
  streak.r   = (rMin + Math.random() * (rMax - rMin)) * diag;
  streak.len =
    (STREAK_MIN_LEN_RATIO +
      Math.random() * (STREAK_MAX_LEN_RATIO - STREAK_MIN_LEN_RATIO)) *
    diag;
  streak.width     = 0.8 + Math.random() * 1.8;
  streak.baseAlpha = 0.50 + Math.random() * 0.45;
}

function createWindState() {
  return {
    streaks: null,
    intensity: 0,
  };
}

function drawWindStreaks(ctx, gameState, width, height, state) {
  const rawSpeed = gameState.speed || 0;
  const speedKmh = rawSpeed * SPEED_KMH_SCALE;

  const targetIntensity =
    speedKmh <= EFFECT_SPEED_MIN
      ? 0
      : Math.min(
          1,
          (speedKmh - EFFECT_SPEED_MIN) / (EFFECT_SPEED_MAX - EFFECT_SPEED_MIN),
        );

  const rate = targetIntensity >= state.intensity ? RAMP_UP_RATE : RAMP_DOWN_RATE;
  state.intensity += (targetIntensity - state.intensity) * rate;

  if (state.intensity < 0.01) {
    state.intensity = 0;
    return;
  }

  const diag   = Math.hypot(width, height);
  const focusX = width  * 0.5;
  const focusY = height * 0.40;

  if (!state.streaks) {
    state.streaks = Array.from({ length: STREAK_COUNT }, () => {
      const s = {};
      _initStreak(s, diag, true);
      return s;
    });
  }

  const vel      = STREAK_BASE_VEL * diag * state.intensity;
  const deadR    = STREAK_DEAD_R * diag;
  const spawnMin = STREAK_SPAWN_R_MIN * diag;

  ctx.save();
  ctx.lineCap = "round";

  const streaks = state.streaks;
  for (let i = 0; i < STREAK_COUNT; i++) {
    const sk = streaks[i];
    sk.r -= vel * (0.7 + sk.width * 0.3);

    if (sk.r + sk.len < deadR) {
      _initStreak(sk, diag, false);
    }

    const rHead = sk.r;
    const rTail = rHead + sk.len;
    if (rTail <= 0) continue;

    const cos = Math.cos(sk.angle);
    const sin = Math.sin(sk.angle);

    const x1 = focusX + cos * rTail;
    const y1 = focusY + sin * rTail;
    const x2 = focusX + cos * Math.max(rHead, 0);
    const y2 = focusY + sin * Math.max(rHead, 0);

    const rFrac      = rTail / (STREAK_SPAWN_R_MAX * diag);
    const spawnFade  = Math.min(1, (rTail - spawnMin * 0.5) / spawnMin);
    const centerFade = Math.min(1, (rHead - deadR) / (spawnMin * 0.35));
    const edgeFade   = rFrac > 0.85 ? 1 - (rFrac - 0.85) / 0.15 : 1;
    const alpha      = sk.baseAlpha * state.intensity * spawnFade * centerFade * edgeFade;

    if (alpha <= 0) continue;

    const color = rHead / (STREAK_SPAWN_R_MAX * diag) > 0.40 ? COLOR_FAR : COLOR_NEAR;
    ctx.lineWidth   = sk.width;
    ctx.strokeStyle = `${color} ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (state.intensity > 0.25) {
    const vigAlpha = (state.intensity - 0.25) * 0.18;
    const cx   = width  * 0.5;
    const cy   = height * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, diag * 0.25, cx, cy, diag * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,5,18,${vigAlpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

export { createWindState, drawWindStreaks };
