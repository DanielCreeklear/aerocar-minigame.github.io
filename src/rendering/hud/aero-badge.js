import { drawRoundedRect } from "../../utils/canvas.js";
import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";


function drawAeroBadge(ctx, gameState, width, height) {
  const L = HUD_LAYOUT;
  const isX = gameState.aeroMode === "X";

  const badgeW = Math.max(
    L.badgeMinWidth,
    Math.min(L.badgeMaxWidth, width * L.badgeWidthRatio),
  );
  const badgeH = Math.max(
    L.badgeMinHeight,
    Math.min(L.badgeMaxHeight, height * L.badgeHeightRatio),
  );

  const speedW = Math.max(
    L.speedMinWidth,
    Math.min(L.speedMaxWidth, width * L.speedWidthRatio),
  );
  const speedH = Math.max(
    L.speedMinHeight,
    Math.min(L.speedMaxHeight, height * L.speedHeightRatio),
  );
  const margin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, width * L.speedRightMarginRatio),
  );
  const speedX = width - speedW - margin;
  const speedY = height - speedH - Math.max(L.speedMinMargin, Math.min(L.speedMaxMargin, height * L.speedBottomMarginRatio));

  const x = speedX + speedW - badgeW;
  const y = speedY - badgeH - 8;

  const fillColor = isX ? HUD_COLORS.badgeModeX : HUD_COLORS.badgeModeZ;
  const borderColor = isX ? HUD_COLORS.badgeModeXBorder : HUD_COLORS.badgeModeZBorder;
  const glowColor = isX ? HUD_COLORS.badgeModeXGlow : HUD_COLORS.badgeModeZGlow;

  ctx.save();

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;
  drawRoundedRect(ctx, x, y, badgeW, badgeH, 4);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  ctx.fillRect(x + 2, y + 2, badgeW - 4, Math.max(2, badgeH * 0.18));

  const fontSize = responsiveSize(width, HUD_FONTS.badgeMode);
  ctx.fillStyle = HUD_COLORS.badgeText;
  ctx.font = `${HUD_FONTS.bold} ${fontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  ctx.fillText(isX ? "MODO X" : "MODO Z", x + badgeW * 0.5, y + badgeH * 0.5);

  ctx.restore();
}

export { drawAeroBadge };
