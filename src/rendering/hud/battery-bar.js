import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";

function drawBatteryBar(ctx, gameState, width, height) {
  const L = HUD_LAYOUT;
  const battery = Math.max(0, Math.min(100, gameState.battery || 0));
  const { isBoosting, isBraking } = gameState;

  const barW = Math.max(
    L.batteryMinWidth,
    Math.min(L.batteryMaxWidth, width * L.batteryWidthRatio),
  );
  const barH = Math.max(
    L.batteryMinHeight,
    Math.min(L.batteryMaxHeight, height * L.batteryHeightRatio),
  );
  const marginX = Math.max(
    L.batteryMinMargin,
    Math.min(L.batteryMaxMargin, width * L.batteryLeftMarginRatio),
  );
  const marginY = Math.max(
    L.batteryMinMargin,
    Math.min(L.batteryMaxMargin, height * L.batteryTopMarginRatio),
  );
  const x = marginX;
  const y = marginY;

  // ── RANK block (top-left corner) ──────────────────────────────────────────
  ctx.save();
  const rankLabelSz = responsiveSize(width, HUD_FONTS.rankLabel);
  const rankValSz = responsiveSize(width, HUD_FONTS.rankValue);
  const rankBlockH = rankLabelSz + rankValSz + 6;
  const rankY = Math.max(4, y - rankBlockH - 6);

  ctx.fillStyle = HUD_COLORS.lapPanel;
  ctx.fillRect(x - 2, rankY - 2, barW + 4, rankBlockH + 4);
  ctx.strokeStyle = HUD_COLORS.lapPanelBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 2, rankY - 2, barW + 4, rankBlockH + 4);

  ctx.font = `${HUD_FONTS.bold} ${rankLabelSz}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapLabel;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RANK", x + 4, rankY + 2);

  ctx.font = `${HUD_FONTS.bold} ${rankValSz}px ${HUD_FONTS.family}`;
  ctx.fillStyle = HUD_COLORS.lapTime;
  ctx.textAlign = "right";
  ctx.fillText("P 1", x + barW - 4, rankY + 2);
  ctx.restore();

  let fillColor;
  if (isBraking && !isBoosting) {
    fillColor = HUD_COLORS.batteryRegen;
  } else if (isBoosting) {
    fillColor = battery < 20 ? HUD_COLORS.batteryLow : HUD_COLORS.batteryMid;
  } else {
    fillColor =
      battery < 25
        ? HUD_COLORS.batteryLow
        : battery < 50
          ? HUD_COLORS.batteryMid
          : HUD_COLORS.batteryFull;
  }

  ctx.save();

  ctx.shadowColor = fillColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = HUD_COLORS.batteryPanel;
  ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
  ctx.shadowBlur = 0;

  const segments = L.batterySegments;
  const filledSegments = Math.round((battery / 100) * segments);
  const gap = 3;
  const segW = (barW - gap * (segments - 1)) / segments;

  for (let i = 0; i < segments; i++) {
    const sx = x + i * (segW + gap);
    if (i < filledSegments) {
      const brightness = 0.7 + (i / segments) * 0.3;
      ctx.globalAlpha = brightness;
      ctx.fillStyle = fillColor;
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(7, 5, 26, 0.9)";
    }
    ctx.fillRect(sx, y, segW, barH);

    if (i < segments - 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = HUD_COLORS.batterySegmentSep;
      ctx.fillRect(sx + segW, y, gap, barH);
    }
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = HUD_COLORS.batteryBorder;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, barW, barH);

  const labelSize = responsiveSize(width, HUD_FONTS.batteryLabel);
  ctx.fillStyle = HUD_COLORS.batteryLabel;
  ctx.font = `${HUD_FONTS.bold} ${labelSize}px ${HUD_FONTS.family}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const regenTag = isBraking && !isBoosting ? " [REGEN]" : "";
  const boostTag = isBoosting ? " [BOOST]" : "";
  ctx.fillText(
    `ERS ${Math.floor(battery)}%${regenTag}${boostTag}`,
    x,
    y + barH + 4,
  );

  ctx.restore();
}

export { drawBatteryBar };
