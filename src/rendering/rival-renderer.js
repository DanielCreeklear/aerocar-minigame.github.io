import {
  LATERAL_RENDER_SCALE,
  HALF_RATIO,
  Z_RESOLUTION,
} from "../constants/index.js";
import { wrapDelta } from "../systems/rival-physics.js";


const SCALE_MIN = 0.12;
const SCALE_MAX = 1.0;


const RIVAL_VISIBLE_DZ = 500;


const RIVAL_VISIBLE_DZ_BEHIND = 120;


const RIVAL_FADE_RANGE_PX = 70;


function drawRivals(ctx, gameState, track, metrics) {
  const rivals = gameState.rivals;
  if (!rivals || rivals.length === 0) return;

  const { width } = metrics;
  const carY = metrics.carY;
  const lapLength = track.lapLength;

  const cameraX = (
    gameState.currentTrackPoint || track.getTrackPoint(gameState.currentZ)
  ).x;
  const playerLapZ = gameState.currentZ % lapLength;

  
  const visible = [];
  for (const rival of rivals) {
    const dZ = wrapDelta(playerLapZ, rival.currentZ, lapLength);
    
    if (dZ >= RIVAL_VISIBLE_DZ || dZ < -RIVAL_VISIBLE_DZ_BEHIND) continue;

    const screenY = carY - dZ;
    const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, screenY / carY));

    const trackPt = track.getTrackPoint(rival.currentZ);
    const screenX =
      width * HALF_RATIO +
      (trackPt.x - cameraX) +
      rival.lateralOffset * LATERAL_RENDER_SCALE;

    
    const roadAngle = Math.atan2(trackPt.yaw ?? 0, Z_RESOLUTION);


    const appearScreenY = carY - RIVAL_VISIBLE_DZ;
    const alpha = Math.min(1, (screenY - appearScreenY) / RIVAL_FADE_RANGE_PX);

    visible.push({ rival, screenX, screenY, scale, alpha, roadAngle });
  }

  
  visible.sort((a, b) => a.screenY - b.screenY);

  for (const { rival, screenX, screenY, scale, alpha, roadAngle } of visible) {
    _drawRivalCar(
      ctx,
      rival,
      screenX,
      screenY,
      scale,
      alpha,
      roadAngle,
      metrics,
    );
  }
}

function _drawRivalCar(
  ctx,
  rival,
  screenX,
  screenY,
  scale,
  alpha,
  roadAngle,
  metrics,
) {
  const w = metrics.carWidth * scale;
  const h = metrics.carHeight * scale;
  const x = screenX;
  const y = screenY;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(roadAngle);

  
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.28, w * 0.46, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  
  const bodyW = w * 0.72;
  const bodyH = h * 0.88;
  ctx.fillStyle = rival.livery.body;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 4 * scale);
  ctx.fill();

  
  const stripeH = bodyH * 0.25;
  ctx.fillStyle = rival.livery.accent;
  ctx.beginPath();
  ctx.roundRect(-bodyW * 0.35, -stripeH / 2, bodyW * 0.7, stripeH, 2 * scale);
  ctx.fill();

  
  const wingW = w * 0.9;
  const wingH = h * 0.07;
  ctx.fillStyle = rival.livery.accent;
  ctx.fillRect(-wingW / 2, -bodyH / 2 - wingH, wingW, wingH);

  
  ctx.fillStyle = rival.livery.body;
  ctx.fillRect((-wingW / 2) * 0.85, bodyH / 2, wingW * 0.85, wingH);

  
  const wheelW = w * 0.2;
  const wheelH = h * 0.22;
  const wOffX = bodyW * 0.38;
  const wOffYF = bodyH * 0.28;
  const wOffYR = bodyH * 0.28;
  ctx.fillStyle = "#1A1A1A";
  
  for (const [wx, wy] of [
    [-wOffX, -wOffYF],
    [wOffX, -wOffYF],
    [-wOffX, wOffYR],
    [wOffX, wOffYR],
  ]) {
    ctx.beginPath();
    ctx.roundRect(wx - wheelW / 2, wy - wheelH / 2, wheelW, wheelH, 2 * scale);
    ctx.fill();
  }

  
  if (scale > 0.45) {
    const fontSize = Math.max(8, Math.round(10 * scale));
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rival.rank, 0, 0);
  }

  ctx.restore();
}

export { drawRivals };
