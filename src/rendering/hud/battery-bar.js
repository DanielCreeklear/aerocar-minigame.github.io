const R4_ACCENT = "#FDB80B";
const R4_BG = "rgba(26,26,26,0.80)";
const R4_SHADOW = "rgba(0,0,0,0.50)";
const R4_FONT = "'Archivo Narrow','Barlow Condensed','Roboto Condensed',sans-serif";
const ERS_SEGMENTS = 10;
function drawBatteryBar(ctx, gameState, width, height) {
  const battery = Math.max(0, Math.min(100, gameState.battery || 0));
  const { isBoosting, isBraking } = gameState;
  const rank = gameState.rank != null ? gameState.rank : 1;
  const margin = Math.max(8, Math.min(14, width * 0.022));
  const rankSz = Math.max(36, Math.min(52, width * 0.085));
  const rx = margin;
  const ry = margin;
  ctx.save();
  ctx.fillStyle = R4_SHADOW;
  ctx.fillRect(rx + 4, ry + 4, rankSz, rankSz);
  ctx.fillStyle = R4_ACCENT;
  ctx.fillRect(rx, ry, rankSz, rankSz);
  const rankFontSz = Math.max(16, Math.min(26, rankSz * 0.54));
  ctx.font = `italic bold ${rankFontSz}px ${R4_FONT}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`P${rank}`, rx + rankSz / 2, ry + rankSz / 2);
  ctx.restore();
  const ersGap = 6;
  const ersX = margin;
  const ersY = ry + rankSz + ersGap;
  const ersBarW = Math.max(80, Math.min(140, width * 0.22));
  const ersBarH = Math.max(12, Math.min(18, height * 0.028));
  const segGap = 2;
  const segW = (ersBarW - segGap * (ERS_SEGMENTS - 1)) / ERS_SEGMENTS;
  const filledSegments = Math.round((battery / 100) * ERS_SEGMENTS);
  ctx.save();
  ctx.fillStyle = R4_SHADOW;
  ctx.fillRect(ersX + 4, ersY + 4, ersBarW, ersBarH);
  ctx.fillStyle = R4_BG;
  ctx.fillRect(ersX, ersY, ersBarW, ersBarH);
  ctx.fillStyle = R4_ACCENT;
  ctx.fillRect(ersX, ersY, 3, ersBarH);
  let fillColor;
  if (isBraking && !isBoosting) {
    fillColor = "#00E5FF"; 
  } else if (battery < 25) {
    fillColor = "#FF3300";
  } else {
    fillColor = R4_ACCENT;
  }
  const now = performance.now();
  for (let i = 0; i < ERS_SEGMENTS; i++) {
    const sx = ersX + 3 + i * (segW + segGap) + 1;
    const sw = segW - 1;
    if (i < filledSegments) {
      const isActiveSegment = i === filledSegments - 1 && isBoosting;
      if (isActiveSegment && Math.floor(now / 100) % 2 === 0) {
        ctx.fillStyle = "#FFFFFF";
      } else {
        ctx.fillStyle = fillColor;
      }
    } else {
      ctx.fillStyle = "rgba(60,60,60,0.85)";
    }
    ctx.fillRect(sx, ersY + 1, sw, ersBarH - 2);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ersX + 3, ersY, ersBarW - 3, ersBarH);
  const lblSz = Math.max(8, Math.min(11, width * 0.018));
  ctx.font = `italic bold ${lblSz}px ${R4_FONT}`;
  ctx.fillStyle = "rgba(253,184,11,0.70)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const tag = isBraking && !isBoosting ? "ERS  REGEN" : isBoosting ? "ERS  BOOST" : `ERS  ${Math.floor(battery)}%`;
  ctx.fillText(tag, ersX + 4, ersY + ersBarH + 3);
  ctx.restore();
}
export { drawBatteryBar };