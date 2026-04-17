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
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, badgeW, badgeH);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = borderColor;
  ctx.fillRect(x, y, badgeW, 3);
  const fontSize = responsiveSize(width, HUD_FONTS.badgeMode);
  ctx.fillStyle = HUD_COLORS.badgeText;
  ctx.font = `${HUD_FONTS.bold} ${fontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.fillText(isX ? "MODO X" : "MODO Z", x + badgeW * 0.5, y + badgeH * 0.5);
  ctx.restore();
}
export { drawAeroBadge };