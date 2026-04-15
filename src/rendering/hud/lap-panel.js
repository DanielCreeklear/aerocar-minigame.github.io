import { drawRoundedRect } from "../../utils/canvas.js";
import { responsiveSize } from "../../utils/canvas.js";
import { formatTime } from "../../utils/math.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";

function drawLapPanel(ctx, gameState, width, height) {
  const L = HUD_LAYOUT;

  const panelW = Math.max(
    L.lapMinWidth,
    Math.min(L.lapMaxWidth, width * L.lapWidthRatio),
  );
  const panelH = Math.max(
    L.lapMinHeight,
    Math.min(L.lapMaxHeight, height * L.lapHeightRatio),
  );
  const marginX = Math.max(
    L.lapMinMargin,
    Math.min(L.lapMaxMargin, width * L.lapRightMarginRatio),
  );
  const marginY = Math.max(
    L.lapMinMargin,
    Math.min(L.lapMaxMargin, height * L.lapTopMarginRatio),
  );
  const x = width - panelW - marginX;
  const y = marginY;

  ctx.save();

  ctx.shadowColor = HUD_COLORS.lapPanelBorder;
  ctx.shadowBlur = 10;
  drawRoundedRect(ctx, x, y, panelW, panelH, 0);
  ctx.fillStyle = HUD_COLORS.lapPanel;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = HUD_COLORS.lapPanelBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = HUD_COLORS.lapPanelBorder;
  ctx.fillRect(x, y, 3, panelH);

  const pad = 10;
  const col1 = x + pad;
  const col2 = x + panelW - pad;

  const labelSize = responsiveSize(width, HUD_FONTS.lapLabel);
  const timeSize = responsiveSize(width, HUD_FONTS.lapTime);
  const lapCountSize = responsiveSize(width, HUD_FONTS.lapCount);

  // ── Row 1: labels ──────────────────────────────────────────────────────────
  ctx.font = `${HUD_FONTS.bold} ${labelSize}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapLabel;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("TEMPO", col1, y + 8);

  ctx.textAlign = "right";
  ctx.fillStyle = HUD_COLORS.lapCountLabel;
  ctx.fillText("VOLTA", col2, y + 8);

  // ── Row 2: values ──────────────────────────────────────────────────────────
  const row2Y = y + 8 + labelSize + 3;

  ctx.font = `${HUD_FONTS.bold} ${timeSize}px ${HUD_FONTS.family}`;
  ctx.shadowColor = HUD_COLORS.lapTime;
  ctx.shadowBlur = 8;
  ctx.fillStyle = HUD_COLORS.lapTime;
  ctx.textAlign = "left";
  ctx.fillText(formatTime(gameState.currentTime), col1, row2Y);

  ctx.shadowBlur = 0;
  ctx.textAlign = "right";
  ctx.font = `${HUD_FONTS.bold} ${lapCountSize}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapCount;
  const lapStr = `${gameState.lapCount + 1}/${gameState.targetLaps}`;
  ctx.fillText(lapStr, col2, row2Y);

  // ── Row 3: best lap ────────────────────────────────────────────────────────
  const divY = row2Y + timeSize + 6;
  ctx.strokeStyle = "rgba(200, 150, 10, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 6, divY);
  ctx.lineTo(x + panelW - 6, divY);
  ctx.stroke();

  const row3Y = divY + 5;
  const bestLabelSz = Math.max(8, labelSize - 1);
  const bestTimeSz  = Math.max(10, timeSize * 0.72);

  ctx.font = `${HUD_FONTS.bold} ${bestLabelSz}px ${HUD_FONTS.family}`;
  ctx.fillStyle = "rgba(58, 80, 112, 0.85)";
  ctx.textAlign = "left";
  ctx.fillText("MELHOR", col1, row3Y);

  const bestTxt = gameState.bestLapTime < Infinity
    ? formatTime(gameState.bestLapTime)
    : "--:--.---";

  ctx.font = `${HUD_FONTS.bold} ${bestTimeSz}px ${HUD_FONTS.family}`;
  ctx.fillStyle = gameState.bestLapTime < Infinity
    ? HUD_COLORS.lapPanelBorder
    : "rgba(240,236,228,0.30)";
  ctx.textAlign = "right";
  ctx.fillText(bestTxt, col2, row3Y);

  // ── Lap completion flash ───────────────────────────────────────────────────
  if (gameState.lastLapFlashTimer > 0 && gameState.lastLapTime != null) {
    const alpha = Math.min(1, gameState.lastLapFlashTimer / 2.0);
    const flashH = 20;
    const flashY = y + panelH + 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(204, 0, 30, 0.82)";
    ctx.fillRect(x, flashY, panelW, flashH);
    ctx.fillStyle = "#F0EAE0";
    ctx.font = `${HUD_FONTS.bold} ${Math.max(9, bestLabelSz)}px ${HUD_FONTS.family}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `VOLTA ${gameState.lapCount}:  ${formatTime(gameState.lastLapTime)}`,
      x + 8,
      flashY + flashH * 0.5,
    );
    ctx.restore();
  }

  ctx.textAlign = "left";
  ctx.restore();
}

export { drawLapPanel };
