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






const BARRIER_W = 14; 
const GRAVEL_W = 22; 
const HAZARD_PERIOD = 24; 

function _drawBarrierSlice(ctx, barrierInnerX, dir, sliceZ, y, step) {
  const bx = dir > 0 ? barrierInnerX : barrierInnerX - BARRIER_W;
  const gx = dir > 0 ? barrierInnerX - GRAVEL_W : barrierInnerX + BARRIER_W;

  
  ctx.fillStyle = "#8a9aac";
  ctx.fillRect(gx, y, GRAVEL_W * dir, step);
  
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
  
  const shadowW = Math.round(GRAVEL_W * 0.35);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(
    dir > 0 ? barrierInnerX - shadowW : barrierInnerX,
    y,
    shadowW,
    step,
  );

  
  const beat = Math.floor(sliceZ / 6) % 3;
  const concreteBase =
    beat === 0 ? "#6a6a6a" : beat === 1 ? "#636363" : "#696969";
  ctx.fillStyle = concreteBase;
  ctx.fillRect(bx, y, BARRIER_W, step);

  
  const stripePhase = Math.floor(sliceZ / HAZARD_PERIOD) % 2;
  if (stripePhase === 0) {
    ctx.fillStyle = "rgba(253,184,11,0.80)";
    ctx.fillRect(bx, y, BARRIER_W, 1);
  }
  
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(bx, y, 1, step);
}


const _barrierCache = new Map();
function _getBarrierCanvas(bcache, step, barrierShadowW, beat, stripePhase, dir, dots) {
  const key = `${step}:${barrierShadowW}:${beat}:${stripePhase}:${dir}:${dots ? 1 : 0}`;
  let c = bcache.get(key);
  if (c) return c;
  const margin = 2;
  const width = GRAVEL_W + BARRIER_W + barrierShadowW + margin * 2;
  let canvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, step);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = step;
  }
  const cctx = canvas.getContext("2d");
  
  const bodyLocalX = dir > 0 ? GRAVEL_W + margin : margin;
  const gravelLeftLocal = dir > 0 ? bodyLocalX - GRAVEL_W : bodyLocalX + BARRIER_W - GRAVEL_W;
  const shadowLocalX = dir > 0 ? bodyLocalX - barrierShadowW : bodyLocalX + BARRIER_W;

  
  cctx.fillStyle = "#8a9aac";
  cctx.fillRect(gravelLeftLocal, 0, GRAVEL_W, step);
  if (dots) {
    cctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let dx = 1; dx < GRAVEL_W - 1; dx += 4) {
      cctx.fillRect(gravelLeftLocal + dx, 0, 1, 1);
    }
    cctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let dx = 3; dx < GRAVEL_W - 1; dx += 6) {
      cctx.fillRect(gravelLeftLocal + dx, 0, 1, 1);
    }
  }

  
  cctx.fillStyle = "rgba(0,0,0,0.28)";
  cctx.fillRect(shadowLocalX, 0, barrierShadowW, step);

  
  const concreteBase = beat === 0 ? "#6a6a6a" : beat === 1 ? "#636363" : "#696969";
  cctx.fillStyle = concreteBase;
  cctx.fillRect(bodyLocalX, 0, BARRIER_W, step);

  
  if (stripePhase === 0) {
    cctx.fillStyle = "rgba(253,184,11,0.80)";
    cctx.fillRect(bodyLocalX, 0, BARRIER_W, 1);
  }
  
  cctx.fillStyle = "rgba(255,255,255,0.18)";
  cctx.fillRect(bodyLocalX, 0, 1, step);

  bcache.set(key, canvas);
  return canvas;
}

function _drawBarrierCached(ctx, barrierInnerX, dir, sliceZ, y, step, metrics, caches = null) {
  const beat = Math.floor(sliceZ / 6) % 3;
  const stripePhase = Math.floor(sliceZ / HAZARD_PERIOD) % 2;
  const dots = (y & 3) === 0;
  const barrierShadowW = Math.round(metrics.trackWidth * 0.07);
  // prefer instance cache when provided
  let bcache = _barrierCache;
  if (caches && caches.barrierCache) bcache = caches.barrierCache;
  const canvas = _getBarrierCanvas(bcache, step, barrierShadowW, beat, stripePhase, dir, dots);
  
  const margin = 2;
  if (dir > 0) {
    const localBodyOffset = GRAVEL_W + margin;
    const drawX = Math.round(barrierInnerX - localBodyOffset);
    ctx.drawImage(canvas, drawX, y);
  } else {
    const localBodyOffset = margin;
    const bx = barrierInnerX - BARRIER_W; 
    const drawX = Math.round(bx - localBodyOffset);
    ctx.drawImage(canvas, drawX, y);
  }
}

function drawTrack(ctx, gameState, track, metrics, cameraXOpt, caches = null) {
  const { width, height } = metrics;
  const carY = metrics.carY;
  const halfRoad = metrics.trackWidth * HALF_RATIO;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const cameraX = typeof cameraXOpt === 'number' ? cameraXOpt : carTrackInfo.x;
  
  const _scanInfo = {};

  
  ctx.fillStyle = RENDER_COLORS.grass;
  ctx.fillRect(0, 0, width, height);

  const runoffW = Math.max(6, Math.round(metrics.borderWidth * 0.8));
  
  const scanlineScroll = gameState.currentZ * 0.5;
  
  const barrierShadowW = Math.round(metrics.trackWidth * 0.07);
  const trackWidth = metrics.trackWidth;
  const rubberWConst = Math.round(trackWidth * 0.16);

  for (let y = 0; y < height; y += metrics.roadSampleStep) {
    const sliceZ = gameState.currentZ + (carY - y);
    const info = track.getTrackPoint(sliceZ, _scanInfo);

    
    const centerX = Math.round(width * HALF_RATIO + (info.x - cameraX));
    const left = centerX - halfRoad;
    const right = centerX + halfRoad;
    const bw = metrics.borderWidth;
    const step = metrics.roadSampleStep;

    
    const grassBeat = Math.floor(sliceZ / 150) % 2 === 0;
    if (!grassBeat) {
      ctx.fillStyle = RENDER_COLORS.grassDark;
      ctx.fillRect(0, y, width, step);
    }

    
    const leftCurbOuter = left - bw;
    const rightCurbOuter = right + bw;
    _drawBarrierCached(ctx, leftCurbOuter - runoffW, -1, sliceZ, y, step, metrics, caches);
    _drawBarrierCached(ctx, rightCurbOuter + runoffW, +1, sliceZ, y, step, metrics, caches);

    
    ctx.fillStyle = RENDER_COLORS.runoff;
    ctx.fillRect(leftCurbOuter - runoffW, y, runoffW, step);
    ctx.fillRect(rightCurbOuter, y, runoffW, step);
    
    if (Math.floor((y + scanlineScroll * 0.3) / 5) % 2 === 0) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (let dx = 2; dx < runoffW; dx += 5) {
        ctx.fillRect(leftCurbOuter - runoffW + dx, y, 1, 1);
        ctx.fillRect(rightCurbOuter + dx, y, 1, 1);
      }
    }

    
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
    
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(left - bw, y, 1, step);
    ctx.fillRect(left - 1, y, 1, step);
    ctx.fillRect(right, y, 1, step);
    ctx.fillRect(right + bw - 1, y, 1, step);

    
    const asphaltColor = isCurve
      ? RENDER_COLORS.asphaltCurve
      : RENDER_COLORS.asphaltStraight;
    ctx.fillStyle = asphaltColor;
    ctx.fillRect(left, y, trackWidth, step);

    
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.fillRect(left, y, barrierShadowW, step);
    ctx.fillRect(right - barrierShadowW, y, barrierShadowW, step);

    
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(Math.round(centerX - rubberWConst / 2), y, rubberWConst, step);

    
    if (Math.floor((y + scanlineScroll) / 4) % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(left, y, trackWidth, 1);
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
      ctx.fillRect(left, y, trackWidth, step);
    }
    if (info.marker === "start-finish") {
      const checkRow = Math.floor(info.z / 10);
      const numCols = 8;
      const colW = Math.ceil(trackWidth / numCols);
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
      const boxW = Math.round(trackWidth * 0.32);
      const boxX = isRight ? left + Math.round(trackWidth * 0.55) : left + Math.round(trackWidth * 0.13);
      ctx.fillStyle = RENDER_COLORS.gridLine;
      ctx.fillRect(boxX, y, boxW, step);
    }
  }
}
export { drawTrack };
