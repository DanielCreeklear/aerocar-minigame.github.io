import { drawRoundedRect } from "../../utils/canvas.js";
import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";


function drawSpeedometer(ctx, displayedSpeedKmh, width, height) {
  const L = HUD_LAYOUT;
  const panelW = Math.max(
    L.speedMinWidth,
    Math.min(L.speedMaxWidth, width * L.speedWidthRatio),
  );
  const panelH = Math.max(
    L.speedMinHeight,
    Math.min(L.speedMaxHeight, height * L.speedHeightRatio),
  );
  const margin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, width * L.speedRightMarginRatio),
  );
  const x = width - panelW - margin;
  const y = height - panelH - Math.max(L.speedMinMargin, Math.min(L.speedMaxMargin, height * L.speedBottomMarginRatio));

  const shownSpeed = Math.round(displayedSpeedKmh);

  ctx.save();

  // Outer glow
  ctx.shadowColor = HUD_COLORS.speedPanelGlow;
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, x, y, panelW, panelH, 4);
  ctx.fillStyle = HUD_COLORS.speedPanel;
  ctx.fill();

  // Border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top accent bar
  ctx.fillStyle = HUD_COLORS.speedPanelBorder;
  ctx.fillRect(x + 2, y + 2, panelW - 4, 3);

  // Speed value
  const speedFontSize = responsiveSize(width, HUD_FONTS.speedValue);
  ctx.shadowColor = HUD_COLORS.speedValue;
  ctx.shadowBlur = 12;
  ctx.fillStyle = HUD_COLORS.speedValue;
  ctx.font = `${HUD_FONTS.bold} ${speedFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`${shownSpeed}`, x + panelW - 10, y + panelH * 0.5);

  // KM/H label
  ctx.shadowBlur = 0;
  const labelFontSize = responsiveSize(width, HUD_FONTS.speedLabel);
  ctx.fillStyle = HUD_COLORS.speedLabel;
  ctx.font = `${HUD_FONTS.bold} ${labelFontSize}px ${HUD_FONTS.family}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("KM/H", x + panelW - 10, y + panelH - 8);

  ctx.restore();
}

export { drawSpeedometer };
