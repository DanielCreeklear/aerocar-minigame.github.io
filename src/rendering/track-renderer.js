import {
  BORDER_WIDTH,
  CURVE_STRIPE_LENGTH,
  HALF_RATIO,
  RENDER_COLORS,
  ROAD_SAMPLE_STEP,
  STRAIGHT_STRIPE_LENGTH,
  TRACK_TYPES,
  TRACK_WIDTH,
} from "../constants/index.js";

function drawTrack(ctx, gameState, track, metrics) {
  const { width, height } = metrics;
  const carY = metrics.carY;
  const halfRoad = metrics.trackWidth * HALF_RATIO;
  const carTrackInfo =
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ);
  const cameraX = carTrackInfo.x;

  ctx.fillStyle = RENDER_COLORS.grass;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += metrics.roadSampleStep) {
    const sliceZ = gameState.currentZ + (carY - y);
    const info = track.getTrackPoint(sliceZ);
    const centerX = width * HALF_RATIO + (info.x - cameraX);

    const left = Math.round(centerX - halfRoad);
    const right = Math.round(centerX + halfRoad);

    const isCurve = info.type === TRACK_TYPES.CURVE;
    const stripeLength = isCurve ? CURVE_STRIPE_LENGTH : STRAIGHT_STRIPE_LENGTH;
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
      left - metrics.borderWidth,
      y,
      metrics.borderWidth,
      metrics.roadSampleStep,
    );
    ctx.fillRect(right, y, metrics.borderWidth, metrics.roadSampleStep);

    ctx.fillStyle = asphaltColor;
    ctx.fillRect(left, y, metrics.trackWidth, metrics.roadSampleStep);

    if (info.isModeXZone) {
      ctx.fillStyle = RENDER_COLORS.asphaltModeX;
      ctx.fillRect(left, y, metrics.trackWidth, metrics.roadSampleStep);
    }

    if (info.marker) {
      ctx.fillStyle = RENDER_COLORS.white;
      ctx.fillRect(left, y, metrics.trackWidth, metrics.roadSampleStep);
    }
  }
}

export { drawTrack };
