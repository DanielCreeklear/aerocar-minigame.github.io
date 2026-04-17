import { LATERAL_RENDER_SCALE, HALF_RATIO } from "../constants/index.js";
import { wrapDelta } from "../systems/rival-physics.js";
const SCALE_MIN = 0.12;
const SCALE_MAX = 1.0;
const OBSTACLE_SCALE_BOOST = 3.5;
const FADE_NEAR_RATIO = 0.35;
const CONE_ORANGE = "#FF6600";
const CONE_ORANGE_DARK = "#CC4400";
const CONE_WHITE = "#F0F0F0";
const CONE_BASE = "#AA4400";
function drawObstacles(ctx, gameState, track, metrics) {
  const obstacles = gameState.obstacles;
  if (!obstacles || obstacles.length === 0) return;
  const { width } = metrics;
  const carY = metrics.carY;
  const lapLength = track.lapLength;
  const cameraX = (
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ)
  ).x;
  const playerLapZ = gameState.currentZ % lapLength;
  const visible = [];
  for (const obs of obstacles) {
    if (obs.hitTimer > 0) continue;
    const dZ = wrapDelta(playerLapZ, obs.lapZ, lapLength);
    if (dZ <= 0 || dZ >= carY) continue; 
    const screenY = carY - dZ;
    const baseScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, screenY / carY));
    const scale = Math.min(SCALE_MAX, baseScale * OBSTACLE_SCALE_BOOST);
    const alpha = Math.min(1, (screenY / carY) / FADE_NEAR_RATIO);
    const trackPt = track.getTrackPoint(obs.lapZ);
    const screenX =
      width * HALF_RATIO +
      (trackPt.x - cameraX) +
      obs.lateralOffset * LATERAL_RENDER_SCALE;
    visible.push({ obs, screenX, screenY, scale, alpha });
  }
  visible.sort((a, b) => a.screenY - b.screenY);
  for (const { screenX, screenY, scale, alpha } of visible) {
    ctx.save();
    ctx.globalAlpha = alpha;
    _drawCone(ctx, screenX, screenY, scale);
    ctx.restore();
  }
}
function _drawCone(ctx, cx, cy, scale) {
  const baseW = 16 * scale;
  const coneH = 28 * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, coneH * 0.18, baseW * 0.7, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CONE_ORANGE;
  ctx.beginPath();
  ctx.moveTo(0, -coneH * 0.82); 
  ctx.lineTo(-baseW / 2, coneH * 0.18); 
  ctx.lineTo(baseW / 2, coneH * 0.18); 
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONE_ORANGE_DARK;
  ctx.beginPath();
  ctx.moveTo(0, -coneH * 0.82);
  ctx.lineTo(0, coneH * 0.18);
  ctx.lineTo(baseW / 2, coneH * 0.18);
  ctx.closePath();
  ctx.fill();
  const stripeYCenter = -coneH * 0.22;
  const stripeHalf = coneH * 0.1;
  const stripeWidthAtY = (t) =>
    baseW * ((stripeYCenter + t - -coneH * 0.82) / coneH) * 1.1;
  ctx.fillStyle = CONE_WHITE;
  ctx.beginPath();
  ctx.moveTo(-stripeWidthAtY(stripeHalf) / 2, stripeYCenter - stripeHalf);
  ctx.lineTo(stripeWidthAtY(stripeHalf) / 2, stripeYCenter - stripeHalf);
  ctx.lineTo(stripeWidthAtY(-stripeHalf) / 2, stripeYCenter + stripeHalf);
  ctx.lineTo(-stripeWidthAtY(-stripeHalf) / 2, stripeYCenter + stripeHalf);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONE_BASE;
  ctx.fillRect(-baseW / 2, coneH * 0.12, baseW, coneH * 0.1);
  ctx.restore();
}
export { drawObstacles };