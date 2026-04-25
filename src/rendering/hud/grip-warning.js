import { clamp } from "../../utils/math.js";
import { HUD_COLORS, HUD_LAYOUT } from "../../constants/index.js";
import { SLIP_PENALTY_THRESHOLD } from "../../constants/index.js";
function drawGripWarning(ctx, gameState, width, height, warningTick, caches = null) {
  const isOffTrack = gameState.isOffTrack;
  const slip = gameState.currentSlip || 0;
  const isPenalized = slip >= SLIP_PENALTY_THRESHOLD;
  if (!isOffTrack && !isPenalized) {
    return 0;
  }
  const nextTick = warningTick + HUD_LAYOUT.warningPulseSpeed * Math.PI * 2;
  const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(nextTick * 8));
  const thickness = HUD_LAYOUT.warningThickness;
  const borderColor = isOffTrack
    ? HUD_COLORS.offTrackBorder
    : HUD_COLORS.warningBorder;
  const glowColor = isOffTrack
    ? HUD_COLORS.offTrackGlow
    : HUD_COLORS.warningGlow;
  
  const key = `${Math.round(width)}x${Math.round(height)}:${isOffTrack ? 1 : 0}`;
  
  let gcache = null;
  if (caches && caches.gripWarningCache) gcache = caches.gripWarningCache;
  else {
    if (!drawGripWarning._cache) drawGripWarning._cache = new Map();
    gcache = drawGripWarning._cache;
  }
  let bmp = gcache.get(key);
  if (!bmp) {
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(Math.round(width), Math.round(height));
    } else {
      canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
    }
    const cctx = canvas.getContext("2d");
    cctx.globalAlpha = 1;
    cctx.shadowColor = glowColor;
    cctx.shadowBlur = 20;
    cctx.strokeStyle = borderColor;
    cctx.lineWidth = thickness * 2;
    cctx.strokeRect(0, 0, width, height);
    cctx.shadowBlur = 0;
    cctx.lineWidth = thickness;
    cctx.strokeRect(thickness * 0.5, thickness * 0.5, width - thickness, height - thickness);
    gcache.set(key, canvas);
    bmp = canvas;
  }
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.drawImage(bmp, 0, 0);
  ctx.restore();
  return nextTick;
}
export { drawGripWarning };
