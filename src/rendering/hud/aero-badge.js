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
  const rightMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, width * L.speedRightMarginRatio),
  );
  const bottomMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, height * L.speedBottomMarginRatio),
  );

  const speedY = height - speedH - bottomMargin;
  const x = width - rightMargin - badgeW;
  const y = speedY - badgeH - 6;
  const lean = Math.round(badgeH * 0.28);

  const fillColor = isX ? HUD_COLORS.badgeModeX : HUD_COLORS.badgeModeZ;
  const borderColor = isX
    ? HUD_COLORS.badgeModeXBorder
    : HUD_COLORS.badgeModeZBorder;
  const glowColor = isX ? HUD_COLORS.badgeModeXGlow : HUD_COLORS.badgeModeZGlow;

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(x - lean, y);
  ctx.lineTo(x + badgeW, y);
  ctx.lineTo(x + badgeW, y + badgeH);
  ctx.lineTo(x, y + badgeH);
  ctx.closePath();

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - lean, y);
  ctx.lineTo(x + badgeW, y);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.stroke();

  const fontSize = responsiveSize(width, HUD_FONTS.badgeMode);
  ctx.fillStyle = HUD_COLORS.badgeText;
  ctx.font = `${HUD_FONTS.bold} ${fontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;
  ctx.fillText(
    isX ? "MODO X" : "MODO Z",
    x + badgeW * 0.5 - lean * 0.5,
    y + badgeH * 0.5,
  );

  ctx.restore();
}

export { drawAeroBadge };
