import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";

const SPEEDOMETER_MAX_KMH = 399;

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

  const x = width - panelW - rightMargin;
  const y = height - panelH - bottomMargin;

  const shownSpeed = Math.round(displayedSpeedKmh);
  const ratio = Math.min(1, displayedSpeedKmh / SPEEDOMETER_MAX_KMH);

  ctx.save();

  // ── Panel background ──────────────────────────────────────────────────────
  ctx.fillStyle = HUD_COLORS.speedPanel;
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, panelW, panelH);
  // Top accent bar
  ctx.fillStyle = HUD_COLORS.speedPanelBorder;
  ctx.fillRect(x, y, panelW, 3);

  // ── Arc tachometer ────────────────────────────────────────────────────────
  // Semi-circle: from Math.PI (left) clockwise through top to Math.PI*2 (right)
  // Needle angle = Math.PI + ratio * Math.PI
  const r = Math.min(panelW * 0.4, panelH * 0.58);
  const cx = x + panelW / 2;
  const cy = y + panelH - 6;

  // Track arc (dim)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2, false);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Danger zone arc — top-right 20% (speed > 80%)
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 1.8, Math.PI * 2, false);
  ctx.strokeStyle = "rgba(204, 0, 30, 0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Progress arc (gold fill)
  const needleAngle = Math.PI + ratio * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, needleAngle, false);
  ctx.strokeStyle = HUD_COLORS.speedValue;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Crimson needle
  const nx = cx + Math.cos(needleAngle) * r;
  const ny = cy + Math.sin(needleAngle) * r;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = HUD_COLORS.speedPanelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pivot dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = HUD_COLORS.speedPanelBorder;
  ctx.fill();

  // ── Digital speed readout ─────────────────────────────────────────────────
  const gaugeCenter = cy - r * 0.42;
  const speedFontSize = responsiveSize(width, HUD_FONTS.speedValue);
  ctx.fillStyle = "#FFD700";
  ctx.font = `${HUD_FONTS.bold} ${speedFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${shownSpeed}`, cx, gaugeCenter);

  const labelFontSize = responsiveSize(width, HUD_FONTS.speedLabel);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `${HUD_FONTS.bold} ${labelFontSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("KM/H", cx, gaugeCenter + 2);

  ctx.restore();
}

export { drawSpeedometer };
