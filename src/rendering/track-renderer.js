import {
  BORDER_WIDTH,
  CURVE_STRIPE_LENGTH,
  HALF_RATIO,
  LATERAL_RENDER_SCALE,
  RENDER_COLORS,
  ROAD_SAMPLE_STEP,
  TRACK_TYPES,
  TRACK_WIDTH,
} from "../constants/index.js";
const AD_COLORS = ["#aa0018", "#1020a0", "#b07400", "#005828", "#5a606c"];

// ─── R4-style concrete barrier (drawn per-slice for parallax) ─────────────────
// barrierX:  screen X of the inner edge of the barrier (facing the gravel)
// dir:       +1 = right side barrier, -1 = left side barrier
// sliceZ:    longitudinal position (for hazard stripe tiling)
// y, step:   canvas row info
const BARRIER_W = 14; // concrete wall thickness in px
const GRAVEL_W = 22; // gravel/escape area between curb outer edge and barrier
const HAZARD_PERIOD = 24; // pixels between hazard stripe starts

function _drawBarrierSlice(ctx, barrierInnerX, dir, sliceZ, y, step) {
  const bx = dir > 0 ? barrierInnerX : barrierInnerX - BARRIER_W;
  const gx = dir > 0 ? barrierInnerX - GRAVEL_W : barrierInnerX + BARRIER_W;

  // Gravel / escape area
  ctx.fillStyle = "#8a9aac";
  ctx.fillRect(gx, y, GRAVEL_W * dir, step);
  // Fine gravel noise (irregular dots)
  if ((y & 3) === 0) {
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let dx = 1; dx < GRAVEL_W - 1; dx += 4) {
      ctx.fillRect(gx + dx * dir, y, 1, 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let dx = 3; dx < GRAVEL_W - 1; dx += 6) {
      ctx.fillRect(gx + dx * dir, y, 1, 1);
    }
  }
  // Barrier shadow on gravel (cast from wall toward track)
  const shadowW = Math.round(GRAVEL_W * 0.35);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(
    dir > 0 ? barrierInnerX - shadowW : barrierInnerX,
    y,
    shadowW,
    step,
  );

  // Concrete wall body (subtle horizontal noise lines)
  const beat = Math.floor(sliceZ / 6) % 3;
  const concreteBase =
    beat === 0 ? "#6a6a6a" : beat === 1 ? "#636363" : "#696969";
  ctx.fillStyle = concreteBase;
  ctx.fillRect(bx, y, BARRIER_W, step);

  // Hazard diagonal stripe (R4 yellow/black) — only 2px wide per stripe
  const stripePhase = Math.floor(sliceZ / HAZARD_PERIOD) % 2;
  if (stripePhase === 0) {
    ctx.fillStyle = "rgba(253,184,11,0.80)";
    ctx.fillRect(bx, y, BARRIER_W, 1);
  }
  // Barrier top highlight (1px white line at inner face)
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(bx, y, 1, step);
}

function drawTrack(ctx, gameState, track, metrics) {
  const { width, height } = metrics;
  const carY = metrics.carY;
  const halfRoad = metrics.trackWidth * HALF_RATIO;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const cameraX = carTrackInfo.x;

  // Full-height grass fill (top-down view — no sky)
  ctx.fillStyle = RENDER_COLORS.grass;
  ctx.fillRect(0, 0, width, height);

  const runoffW = Math.max(6, Math.round(metrics.borderWidth * 0.8));
  // Scanline scroll offset tied to car longitudinal progress
  const scanlineScroll = gameState.currentZ * 0.5;
  // Barrier shadow width — fixed narrow strip
  const barrierShadowW = Math.round(metrics.trackWidth * 0.07);

  for (let y = 0; y < height; y += metrics.roadSampleStep) {
    const sliceZ = gameState.currentZ + (carY - y);
    const info = track.getTrackPoint(sliceZ);

    // Track center at 100% camera speed
    const centerX = width * HALF_RATIO + (info.x - cameraX);
    const left = Math.round(centerX - halfRoad);
    const right = Math.round(centerX + halfRoad);
    const bw = metrics.borderWidth;
    const step = metrics.roadSampleStep;

    // ── Alternating grass strips (outside barriers) ───────────────────────────
    const grassBeat = Math.floor(sliceZ / 150) % 2 === 0;
    if (!grassBeat) {
      ctx.fillStyle = RENDER_COLORS.grassDark;
      ctx.fillRect(0, y, width, step);
    }

    // ── R4 Concrete barriers (anchored to track — no fake horizontal parallax)
    const leftCurbOuter = left - bw;
    const rightCurbOuter = right + bw;
    _drawBarrierSlice(ctx, leftCurbOuter - runoffW, -1, sliceZ, y, step);
    _drawBarrierSlice(ctx, rightCurbOuter + runoffW, +1, sliceZ, y, step);

    // ── Runoff / gravel strip (between curb outer edge and barrier inner edge)
    ctx.fillStyle = RENDER_COLORS.runoff;
    ctx.fillRect(leftCurbOuter - runoffW, y, runoffW, step);
    ctx.fillRect(rightCurbOuter, y, runoffW, step);
    // Gravel dot overlay
    if (Math.floor((y + scanlineScroll * 0.3) / 5) % 2 === 0) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let dx = 2; dx < runoffW; dx += 5) {
        ctx.fillRect(leftCurbOuter - runoffW + dx, y, 1, 1);
        ctx.fillRect(rightCurbOuter + dx, y, 1, 1);
      }
    }

    // ── Curb stripes ──────────────────────────────────────────────────────────
    const isCurve = info.type === TRACK_TYPES.CURVE;
    let stripeColor;
    if (isCurve) {
      const checker = Math.floor(sliceZ / CURVE_STRIPE_LENGTH) % 2 === 0;
      stripeColor = checker ? RENDER_COLORS.red : RENDER_COLORS.white;
    } else {
      stripeColor = RENDER_COLORS.white;
    }
    ctx.fillStyle = stripeColor;
    ctx.fillRect(left - bw, y, bw, step);
    ctx.fillRect(right, y, bw, step);
    // Cel-shaded 1px inner border on each curb segment
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(left - bw, y, 1, step);
    ctx.fillRect(left - 1, y, 1, step);
    ctx.fillRect(right, y, 1, step);
    ctx.fillRect(right + bw - 1, y, 1, step);

    // ── Asphalt fill ──────────────────────────────────────────────────────────
    const asphaltColor = isCurve
      ? RENDER_COLORS.asphaltCurve
      : RENDER_COLORS.asphaltStraight;
    ctx.fillStyle = asphaltColor;
    ctx.fillRect(left, y, metrics.trackWidth, step);

    // ── Barrier shadow projected on asphalt ───────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fillRect(left, y, barrierShadowW, step);
    ctx.fillRect(right - barrierShadowW, y, barrierShadowW, step);

    // ── Rubber / centre darkening ─────────────────────────────────────────────
    const rubberW = Math.round(metrics.trackWidth * 0.16);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(Math.round(centerX - rubberW / 2), y, rubberW, step);

    // ── Speed scanlines (asphalt texture) ─────────────────────────────────────
    if (Math.floor((y + scanlineScroll) / 4) % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(left, y, metrics.trackWidth, 1);
    }
    if (isCurve) {
      const rlOffset = track.getRacingLineTarget(sliceZ);
      const rlX = Math.round(centerX + rlOffset * LATERAL_RENDER_SCALE);
      if (Math.floor(sliceZ / 60) % 3 !== 0) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(rlX - 2, y, 4, step);
      }
    }
    if (info.isModeXZone) {
      ctx.fillStyle = RENDER_COLORS.asphaltModeX;
      ctx.fillRect(left, y, metrics.trackWidth, step);
    }
    if (info.marker === "start-finish") {
      const checkRow = Math.floor(info.z / 10);
      const numCols = 8;
      const colW = Math.ceil(metrics.trackWidth / numCols);
      for (let col = 0; col < numCols; col++) {
        ctx.fillStyle =
          (checkRow + col) % 2 === 0
            ? RENDER_COLORS.finishWhite
            : RENDER_COLORS.finishBlack;
        ctx.fillRect(left + col * colW, y, colW, step);
      }
    }
    if (info.marker && info.marker.startsWith("grid-")) {
      const gridPos = parseInt(info.marker.slice(5), 10);
      const isRight = gridPos % 2 === 1;
      const boxW = Math.round(metrics.trackWidth * 0.32);
      const boxX = isRight
        ? left + Math.round(metrics.trackWidth * 0.55)
        : left + Math.round(metrics.trackWidth * 0.13);
      ctx.fillStyle = RENDER_COLORS.gridLine;
      ctx.fillRect(boxX, y, boxW, step);
    }
  }
}
export { drawTrack };
