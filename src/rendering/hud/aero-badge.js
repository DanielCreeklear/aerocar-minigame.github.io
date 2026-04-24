import { responsiveSize } from "../../utils/canvas.js";
import { AERO_MODES, HUD_COLORS, HUD_FONTS } from "../../constants/index.js";
const BADGE_WIDTH_RATIO = 0.28;
const BADGE_MIN_WIDTH = 100;
const BADGE_MAX_WIDTH = 200;
const BADGE_HEIGHT_RATIO = 0.07;
const BADGE_MIN_HEIGHT = 34;
const BADGE_MAX_HEIGHT = 54;
const BADGE_BOTTOM_MARGIN_RATIO = 0.025;
const BADGE_BOTTOM_MARGIN_MIN = 8;
const BADGE_BOTTOM_MARGIN_MAX = 22;
const BADGE_RADIUS = 0;
// cache rendered badge canvases by size+mode to avoid shadowBlur draw per-frame
const _badgeCache = new Map();
function drawAeroBadge(ctx, gameState, width, height, touchReserve = 0) {
  const isX = gameState.aeroMode === AERO_MODES.X;
  const badgeW = Math.max(
    BADGE_MIN_WIDTH,
    Math.min(BADGE_MAX_WIDTH, width * BADGE_WIDTH_RATIO),
  );
  const badgeH = Math.max(
    BADGE_MIN_HEIGHT,
    Math.min(BADGE_MAX_HEIGHT, height * BADGE_HEIGHT_RATIO),
  );
  const bottomMargin = Math.max(
    BADGE_BOTTOM_MARGIN_MIN,
    Math.min(BADGE_BOTTOM_MARGIN_MAX, height * BADGE_BOTTOM_MARGIN_RATIO),
  );
  const x = (width - badgeW) / 2;
  const y = height - badgeH - bottomMargin - touchReserve;
  const fillColor = isX ? HUD_COLORS.badgeModeX : HUD_COLORS.badgeModeZ;
  const borderColor = isX
    ? HUD_COLORS.badgeModeXBorder
    : HUD_COLORS.badgeModeZBorder;
  const glowColor = isX ? HUD_COLORS.badgeModeXGlow : HUD_COLORS.badgeModeZGlow;
  // try cache
  const key = `${Math.round(badgeW)}x${Math.round(badgeH)}:${isX ? 1 : 0}`;
  let bmp = _badgeCache.get(key);
  if (!bmp) {
    // create offscreen canvas
    let canvas;
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(Math.round(badgeW), Math.round(badgeH));
    } else {
      canvas = document.createElement("canvas");
      canvas.width = Math.round(badgeW);
      canvas.height = Math.round(badgeH);
    }
    const cctx = canvas.getContext("2d");
    // draw badge at 0,0 on offscreen
    cctx.beginPath();
    cctx.rect(0, 0, badgeW, badgeH);
    cctx.shadowColor = glowColor;
    cctx.shadowBlur = 8;
    cctx.fillStyle = fillColor;
    cctx.fill();
    cctx.shadowBlur = 0;
    cctx.strokeStyle = borderColor;
    cctx.lineWidth = 2;
    cctx.stroke();
    cctx.fillStyle = borderColor;
    cctx.fillRect(0, 0, badgeW, 3);
    const fontSize = responsiveSize(width, HUD_FONTS.badgeMode);
    cctx.fillStyle = HUD_COLORS.badgeText;
    cctx.font = `${HUD_FONTS.bold} ${fontSize}px ${HUD_FONTS.family}`;
    cctx.textAlign = "center";
    cctx.textBaseline = "middle";
    cctx.shadowColor = "rgba(0,0,0,0.5)";
    cctx.shadowBlur = 3;
    cctx.fillText(isX ? "MODO X" : "MODO Z", badgeW * 0.5, badgeH * 0.5);
    _badgeCache.set(key, canvas);
    bmp = canvas;
  }
  ctx.drawImage(bmp, x, y);
}
export { drawAeroBadge };
