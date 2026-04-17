const SPEEDOMETER_MAX_KMH = 399;
const R4_ACCENT = "#FDB80B";
const R4_BG = "rgba(26,26,26,0.80)";
const R4_SHADOW = "rgba(0,0,0,0.50)";
const R4_FONT =
  "'Archivo Narrow','Barlow Condensed','Roboto Condensed',sans-serif";
const R4_MONO = "'Courier New',monospace";
function drawSpeedometer(
  ctx,
  displayedSpeedKmh,
  width,
  height,
  isPortrait = false,
  touchReserve = 0,
) {
  const shownSpeed = Math.round(displayedSpeedKmh);
  const ratio = Math.min(1, displayedSpeedKmh / SPEEDOMETER_MAX_KMH);
  const panelW = Math.max(110, Math.min(170, width * 0.28));
  const panelH = Math.max(80, Math.min(110, height * 0.17));
  const margin = Math.max(8, Math.min(16, width * 0.025));
  const x = width - panelW - margin;
  const y = height - panelH - margin - touchReserve;
  ctx.save();
  ctx.fillStyle = R4_SHADOW;
  ctx.fillRect(x + 4, y + 4, panelW, panelH);
  ctx.fillStyle = R4_BG;
  ctx.fillRect(x, y, panelW, panelH);
  ctx.fillStyle = R4_ACCENT;
  ctx.fillRect(x, y, 3, panelH);
  const speedSz = Math.max(36, Math.min(52, panelH * 0.58));
  ctx.font = `italic bold ${speedSz}px ${R4_MONO}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`${shownSpeed}`, x + panelW - 8, y + 6);
  const unitSz = Math.max(10, Math.min(13, panelH * 0.14));
  ctx.font = `italic bold ${unitSz}px ${R4_FONT}`;
  ctx.fillStyle = R4_ACCENT;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("KM/H", x + panelW - 8, y + 8 + speedSz);
  const barY = y + panelH - 6;
  const barInnerW = panelW - 6;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(x + 3, barY, barInnerW, 4);
  ctx.fillStyle = R4_ACCENT;
  ctx.fillRect(x + 3, barY, barInnerW * ratio, 4);
  ctx.restore();
}
export { drawSpeedometer };