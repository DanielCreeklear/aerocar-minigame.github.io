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
  const rightMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, width * L.speedRightMarginRatio),
  );
  const bottomMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, height * L.speedBottomMarginRatio),
  );

  // Bottom-right, parallelogram leans inward (top-left corner cut) — R4 right-side HUD
  const x = width - panelW - rightMargin;
  const y = height - panelH - bottomMargin;
  // lean: top edge shifts LEFT so right edge stays flush with screen margin
  const lean = Math.round(panelH * 0.28);

  const shownSpeed = Math.round(displayedSpeedKmh);

  ctx.save();

  // Parallelogram: top-left corner cut inward
  ctx.beginPath();
  ctx.moveTo(x - lean, y);
  ctx.lineTo(x + panelW, y);
  ctx.lineTo(x + panelW, y + panelH);
  ctx.lineTo(x, y + panelH);
  ctx.closePath();

  ctx.shadowColor = HUD_COLORS.speedPanelGlow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = HUD_COLORS.speedPanel;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Top accent: full top edge highlighted
  ctx.beginPath();
  ctx.moveTo(x - lean, y);
  ctx.lineTo(x + panelW, y);
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Speed value
  const speedFontSize = responsiveSize(width, HUD_FONTS.speedValue);
  ctx.shadowColor = HUD_COLORS.speedValue;
  ctx.shadowBlur = 10;
  ctx.fillStyle = HUD_COLORS.speedValue;
  ctx.font = `${HUD_FONTS.bold} ${speedFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(`${shownSpeed}`, x + panelW - 12, y + panelH * 0.46);

  ctx.shadowBlur = 0;
  const labelFontSize = responsiveSize(width, HUD_FONTS.speedLabel);
  ctx.fillStyle = HUD_COLORS.speedLabel;
  ctx.font = `${HUD_FONTS.bold} ${labelFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("KM/H", x + panelW - 12, y + panelH * 0.78);

  ctx.restore();
}

export { drawSpeedometer };
