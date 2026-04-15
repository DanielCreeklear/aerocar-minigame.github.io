import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";

const SPEEDOMETER_MAX_KMH = 399;

function drawSpeedometer(
  ctx,
  displayedSpeedKmh,
  width,
  height,
  isPortrait = false,
) {
  const L = HUD_LAYOUT;
  const panelW = Math.max(
    isPortrait ? 100 : L.speedMinWidth,
    Math.min(isPortrait ? 150 : L.speedMaxWidth, width * L.speedWidthRatio),
  );
  const panelH = Math.max(
    isPortrait ? 90 : L.speedMinHeight,
    Math.min(isPortrait ? 130 : L.speedMaxHeight, height * L.speedHeightRatio),
  );
  const edgeMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, width * L.speedRightMarginRatio),
  );
  const bottomMargin = Math.max(
    L.speedMinMargin,
    Math.min(L.speedMaxMargin, height * L.speedBottomMarginRatio),
  );

  const x = isPortrait ? edgeMargin : width - panelW - edgeMargin;
  const y = height - panelH - bottomMargin;

  const shownSpeed = Math.round(displayedSpeedKmh);
  const ratio = Math.min(1, displayedSpeedKmh / SPEEDOMETER_MAX_KMH);

  ctx.save();

  const r = Math.min(panelW * 0.4, panelH * 0.58);
  const cx = x + panelW / 2;
  const cy = y + panelH - 6;

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2, false);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.8, Math.PI * 2, false);
  ctx.strokeStyle = "rgba(204, 0, 30, 0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();

  const needleAngle = Math.PI + ratio * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, needleAngle, false);
  ctx.strokeStyle = HUD_COLORS.speedValue;
  ctx.lineWidth = 3;
  ctx.stroke();

  const nx = cx + Math.cos(needleAngle) * r;
  const ny = cy + Math.sin(needleAngle) * r;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = HUD_COLORS.speedPanelBorder;
  ctx.fill();

  const gaugeCenter = cy - r * 0.42;
  const speedFontSize = responsiveSize(width, HUD_FONTS.speedValue);
  ctx.fillStyle = HUD_COLORS.speedValue;
  ctx.font = `${HUD_FONTS.bold} ${speedFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${shownSpeed}`, cx, gaugeCenter);

  const labelFontSize = responsiveSize(width, HUD_FONTS.speedLabel);
  ctx.fillStyle = HUD_COLORS.speedLabel;
  ctx.font = `${HUD_FONTS.bold} ${labelFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("KM/H", cx, gaugeCenter + 2);

  ctx.restore();
}

export { drawSpeedometer };
