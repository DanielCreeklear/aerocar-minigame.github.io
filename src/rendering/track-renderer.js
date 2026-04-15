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

function drawTrack(ctx, gameState, track, metrics) {
  const { width, height } = metrics;
  const carY = metrics.carY;
  const halfRoad = metrics.trackWidth * HALF_RATIO;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const cameraX = carTrackInfo.x;

  ctx.fillStyle = RENDER_COLORS.grass;
  ctx.fillRect(0, 0, width, height);

  const runoffW = Math.max(6, Math.round(metrics.borderWidth * 0.8));
  const detailW = Math.max(10, Math.round(metrics.borderWidth * 0.65));

  for (let y = 0; y < height; y += metrics.roadSampleStep) {
    const sliceZ = gameState.currentZ + (carY - y);
    const info = track.getTrackPoint(sliceZ);
    const centerX = width * HALF_RATIO + (info.x - cameraX);

    const left = Math.round(centerX - halfRoad);
    const right = Math.round(centerX + halfRoad);
    const bw = metrics.borderWidth;
    const step = metrics.roadSampleStep;

    const leftRunoffX = left - bw - runoffW;
    const leftDetailX = leftRunoffX - detailW;
    const rightRunoffX = right + bw;
    const rightDetailX = rightRunoffX + runoffW;

    const grassBeat = Math.floor(sliceZ / 150) % 2 === 0;
    if (!grassBeat) {
      ctx.fillStyle = RENDER_COLORS.grassDark;
      ctx.fillRect(0, y, Math.max(0, leftDetailX), step);
      if (rightDetailX + detailW < width)
        ctx.fillRect(
          rightDetailX + detailW,
          y,
          width - (rightDetailX + detailW),
          step,
        );
    }

    const isCurveDetail = info.type === TRACK_TYPES.CURVE;
    if (isCurveDetail) {
      const warnChecker = Math.floor(sliceZ / 80) % 2 === 0;
      ctx.fillStyle = warnChecker ? RENDER_COLORS.red : RENDER_COLORS.white;
    } else {
      const adIdx =
        ((Math.floor(sliceZ / 1500) % AD_COLORS.length) + AD_COLORS.length) %
        AD_COLORS.length;
      ctx.fillStyle = AD_COLORS[adIdx];
    }
    ctx.fillRect(leftDetailX, y, detailW, step);
    ctx.fillRect(rightDetailX, y, detailW, step);

    ctx.fillStyle = RENDER_COLORS.runoff;
    ctx.fillRect(leftRunoffX, y, runoffW, step);
    ctx.fillRect(rightRunoffX, y, runoffW, step);

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

    const asphaltColor = isCurve
      ? RENDER_COLORS.asphaltCurve
      : RENDER_COLORS.asphaltStraight;
    ctx.fillStyle = asphaltColor;
    ctx.fillRect(left, y, metrics.trackWidth, step);

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
