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
  drawRoundedRect(ctx, x, y, panelW, panelH, 4);
  ctx.fillStyle = HUD_COLORS.lapPanel;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = HUD_COLORS.lapPanelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = HUD_COLORS.lapPanelBorder;
  ctx.fillRect(x + 2, y + 2, panelW - 4, 3);

  const pad = 10;
  const col1 = x + pad;
  const col2 = x + panelW - pad;

  const labelSize = responsiveSize(width, HUD_FONTS.lapLabel);
  const timeSize = responsiveSize(width, HUD_FONTS.lapTime);

  ctx.font = `${HUD_FONTS.bold} ${labelSize}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapLabel;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("TEMPO", col1, y + 10);

  ctx.font = `${HUD_FONTS.bold} ${timeSize}px ${HUD_FONTS.family}`;
  ctx.shadowColor = HUD_COLORS.lapTime;
  ctx.shadowBlur = 8;
  ctx.fillStyle = HUD_COLORS.lapTime;
  ctx.fillText(formatTime(gameState.currentTime), col1, y + 10 + labelSize + 4);

  const lapCountSize = responsiveSize(width, HUD_FONTS.lapCount);

  ctx.shadowBlur = 0;
  ctx.textAlign = "right";
  ctx.font = `${HUD_FONTS.bold} ${labelSize}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapCountLabel;
  ctx.fillText("VOLTA", col2, y + 10);

  ctx.font = `${HUD_FONTS.bold} ${lapCountSize}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapCount;
  const lapStr = `${gameState.lapCount + 1}/${gameState.targetLaps}`;
  ctx.fillText(lapStr, col2, y + 10 + labelSize + 4);
  ctx.textAlign = "left";

  ctx.restore();
}

export { drawLapPanel };
