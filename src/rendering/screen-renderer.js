import { formatTime } from "../utils/math.js";
import { drawRoundedRect, responsiveFont, responsiveSize } from "../utils/canvas.js";
import {
  getResponsiveUILayout,
  getViewportProfile,
  UI_COLORS,
  UI_FONT,
  UI_LAYOUT,
  UI_SHAPE,
  UI_TEXT,
} from "../constants/index.js";

function buildLayoutContext(width, height) {
  const profile = getViewportProfile(width, height);
  const layout = getResponsiveUILayout(UI_LAYOUT, profile);
  return { layout, profile };
}

function calculateTrackBounds(points) {
  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i < points.length; i++) {
    if (points[i].x < minX) minX = points[i].x;
    if (points[i].x > maxX) maxX = points[i].x;
  }

  return { minX, xRange: Math.max(1, maxX - minX) };
}

function projectTrackPoint(points, index, bounds, map) {
  const t = points.length > 1 ? index / (points.length - 1) : 0;
  const nx = (points[index].x - bounds.minX) / bounds.xRange;
  return {
    x: map.mapX + map.drawPad + nx * map.usableW,
    y: map.mapY + map.drawPad + t * map.usableH,
  };
}

function sampleTrackPointIndexes(pointsLength) {
  const step = Math.max(1, Math.floor(pointsLength / UI_SHAPE.previewMaxPointsStep));
  const sampledIndexes = [];

  for (let i = 0; i < pointsLength; i += step) {
    sampledIndexes.push(i);
  }

  const lastIndex = pointsLength - 1;
  if (sampledIndexes[sampledIndexes.length - 1] !== lastIndex) {
    sampledIndexes.push(lastIndex);
  }

  return sampledIndexes;
}

function drawStartScreen(ctx, width, height) {
  const { layout, profile } = buildLayoutContext(width, height);
  const centerX = width * layout.halfRatio;
  const panelWidth = Math.min(
    width * layout.startPanelWidthRatio,
    layout.startPanelMaxWidth,
  );
  const panelHeight = Math.min(
    height * layout.startPanelHeightRatio,
    layout.startPanelMaxHeight,
  );
  const panelX = (width - panelWidth) * layout.halfRatio;
  const panelY = Math.max(
    layout.startPanelMinTopMargin,
    (height - panelHeight) * layout.halfRatio,
  );

  ctx.fillStyle = UI_COLORS.startBgA;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(0, 245, 255, 0.04)";
  ctx.lineWidth = 1;
  const gridSize = 48;
  for (let gx = 0; gx < width; gx += gridSize) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    centerX,
    height * layout.startVignetteCenterYRatio,
    width * layout.startVignetteInnerRatio,
    centerX,
    height * layout.startVignetteCenterYRatio,
    width * layout.startVignetteOuterRatio,
  );
  vignette.addColorStop(0, UI_COLORS.transparentBlack);
  vignette.addColorStop(1, UI_COLORS.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.shadowColor = UI_COLORS.panelStroke;
  ctx.shadowBlur = 22;
  drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, UI_SHAPE.panelRadius);
  ctx.fillStyle = UI_COLORS.panelFill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = UI_COLORS.panelStroke;
  ctx.lineWidth = UI_SHAPE.strokeWidth;
  ctx.stroke();

  ctx.fillStyle = UI_COLORS.panelAccent;
  ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, UI_SHAPE.accentHeight);


  ctx.textAlign = "center";
  ctx.shadowColor = UI_COLORS.gold;
  ctx.shadowBlur = UI_SHAPE.shadowStrong;
  ctx.fillStyle = UI_COLORS.gold;
  ctx.font = responsiveFont(width, UI_FONT.startTitle, UI_FONT.bold);
  ctx.fillText(UI_TEXT.gameTitle, centerX, panelY + panelHeight * layout.titleYRatio);

  ctx.shadowColor = UI_COLORS.neonCyan;
  ctx.shadowBlur = UI_SHAPE.shadowSoft;
  ctx.fillStyle = UI_COLORS.neonCyan;
  ctx.font = responsiveFont(width, UI_FONT.startSubtitle, UI_FONT.bold);
  ctx.fillText(UI_TEXT.startSubtitle, centerX, panelY + panelHeight * layout.subtitleYRatio);

  ctx.shadowBlur = UI_SHAPE.shadowOff;
  ctx.textAlign = "left";
  const textX = panelX + panelWidth * layout.leftColumnXRatio;
  const rightX = panelX + panelWidth * layout.rightColumnXRatio;
  const sectionTop = panelY + panelHeight * layout.sectionTopYRatio;
  const useSingleColumn = profile.isPortrait && profile.isCompactWidth;

  ctx.fillStyle = UI_COLORS.infoBlue;
  ctx.font = responsiveFont(width, UI_FONT.startSection, UI_FONT.bold);
  ctx.fillText(UI_TEXT.controlsTitle, textX, sectionTop);

  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.startBody, UI_FONT.bold);
  ctx.fillText(UI_TEXT.controlsLeft, textX, sectionTop + layout.lineSpacing1);
  ctx.fillText(UI_TEXT.controlsRight, textX, sectionTop + layout.lineSpacing2);

  ctx.fillStyle = UI_COLORS.tipGray;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(UI_TEXT.controlsTip, textX, sectionTop + layout.lineSpacing3);

  const goalColumn = useSingleColumn ? textX : rightX;
  const goalTop = useSingleColumn
    ? sectionTop + layout.lineSpacing3 + 38
    : sectionTop;

  ctx.fillStyle = UI_COLORS.success;
  ctx.font = responsiveFont(width, UI_FONT.startSection, UI_FONT.bold);
  ctx.fillText(UI_TEXT.goalTitle, goalColumn, goalTop);

  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.startBody);
  ctx.fillText(UI_TEXT.goalLine1, goalColumn, goalTop + layout.lineSpacing1);
  ctx.fillText(UI_TEXT.goalLine2, goalColumn, goalTop + layout.lineSpacing2);

  ctx.fillStyle = UI_COLORS.accentOrange;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(UI_TEXT.goalTagline, goalColumn, goalTop + layout.lineSpacing3);

  ctx.fillStyle = UI_COLORS.success;
  ctx.textAlign = "center";
  ctx.font = responsiveFont(width, UI_FONT.startCta, UI_FONT.bold);
  ctx.fillText(UI_TEXT.startCta, centerX, panelY + panelHeight * layout.startCtaYRatio);

  ctx.fillStyle = UI_COLORS.subtleText;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(UI_TEXT.startFootnote, centerX, panelY + panelHeight * layout.startTipYRatio);
  ctx.textAlign = "left";
}

function drawGameOverScreen(ctx, width, height, finalTime) {
  const centerX = width * 0.5;

  ctx.fillStyle = UI_COLORS.gameOverOverlay;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  for (let sy = 0; sy < height; sy += 8) {
    ctx.fillRect(0, sy, width, 4);
  }

  const panelW = Math.min(width * 0.72, 520);
  const panelH = Math.min(height * 0.5, 320);
  const panelX = (width - panelW) * 0.5;
  const panelY = (height - panelH) * 0.5;

  ctx.shadowColor = UI_COLORS.neonGreen;
  ctx.shadowBlur = 20;
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 4);
  ctx.fillStyle = UI_COLORS.panelFill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = UI_COLORS.panelStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = UI_COLORS.neonGreen;
  ctx.fillRect(panelX + 2, panelY + 2, panelW - 4, 4);

  ctx.textAlign = "center";

  const titleSize = responsiveFont(width, UI_FONT.gameOverTitle, UI_FONT.bold);
  ctx.font = titleSize;
  ctx.shadowColor = UI_COLORS.neonPink;
  ctx.shadowBlur = 14;
  ctx.fillStyle = UI_COLORS.white;
  ctx.textBaseline = "middle";
  ctx.fillText(UI_TEXT.gameOverTitle, centerX, panelY + panelH * 0.28);

  const timeSize = responsiveFont(width, UI_FONT.gameOverTime, UI_FONT.bold);
  ctx.font = timeSize;
  ctx.shadowColor = UI_COLORS.gold;
  ctx.shadowBlur = 18;
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(formatTime(finalTime), centerX, panelY + panelH * 0.54);

  ctx.shadowBlur = 0;
  const hintSize = responsiveFont(width, UI_FONT.gameOverHint);
  ctx.font = hintSize;
  ctx.fillStyle = UI_COLORS.subtleText;
  ctx.fillText(UI_TEXT.gameOverHint, centerX, panelY + panelH * 0.76);

  ctx.textAlign = "left";
}

function drawTrackPreviewScreen(ctx, width, height, track) {
  const profile = getViewportProfile(width, height);
  const layout = getResponsiveUILayout(UI_LAYOUT, profile);
  const centerX = width * layout.halfRatio;
  const panelWidth = Math.min(
    width * layout.previewPanelWidthRatio,
    layout.previewPanelMaxWidth,
  );
  const panelHeight = Math.min(
    height * layout.previewPanelHeightRatio,
    layout.previewPanelMaxHeight,
  );
  const panelX = (width - panelWidth) * layout.halfRatio;
  const panelY = (height - panelHeight) * layout.halfRatio;
  const mapPadding = Math.min(layout.mapPaddingMax, panelWidth * layout.mapPaddingRatio);
  const mapX = panelX + mapPadding;
  const mapY = panelY + panelHeight * layout.previewMapYRatio;
  const mapWidth = panelWidth - mapPadding * 2;
  const mapHeight = panelHeight * layout.previewMapHeightRatio;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, UI_COLORS.previewBgA);
  bg.addColorStop(1, UI_COLORS.previewBgB);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(0, 255, 136, 0.03)";
  ctx.lineWidth = 1;
  const gs = 40;
  for (let gx = 0; gx < width; gx += gs) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gs) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
  }

  ctx.shadowColor = UI_COLORS.previewPanelStroke;
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, UI_SHAPE.panelRadius);
  ctx.fillStyle = UI_COLORS.previewPanelFill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = UI_COLORS.previewPanelStroke;
  ctx.lineWidth = UI_SHAPE.strokeWidth;
  ctx.stroke();

  ctx.fillStyle = UI_COLORS.previewPanelStroke;
  ctx.fillRect(panelX + 2, panelY + 2, panelWidth - 4, UI_SHAPE.accentHeight);

  ctx.textAlign = "center";
  ctx.shadowColor = UI_COLORS.success;
  ctx.shadowBlur = 10;
  ctx.fillStyle = UI_COLORS.success;
  ctx.font = responsiveFont(width, UI_FONT.previewTitle, UI_FONT.bold);
  ctx.fillText(UI_TEXT.previewTitle, centerX, panelY + panelHeight * layout.previewTitleYRatio);
  ctx.shadowBlur = 0;

  const totalKm = ((track.lapLength || 0) / 1000).toFixed(2);
  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.previewInfo);
  const previewInfo = UI_TEXT.previewInfoTemplate
    .replace("{seed}", String(track.seed))
    .replace("{segments}", String(track.segments.length))
    .replace("{km}", String(totalKm));
  ctx.fillText(previewInfo, centerX, panelY + panelHeight * layout.previewInfoYRatio);

  drawRoundedRect(ctx, mapX, mapY, mapWidth, mapHeight, UI_SHAPE.mapRadius);
  ctx.fillStyle = UI_COLORS.previewMapFill;
  ctx.fill();
  ctx.strokeStyle = UI_COLORS.previewMapStroke;
  ctx.lineWidth = UI_SHAPE.thinStrokeWidth;
  ctx.stroke();

  const points = track.trackData;
  if (points && points.length > 1) {
    const bounds = calculateTrackBounds(points);
    const drawPad = UI_SHAPE.mapDrawPadding;
    const map = {
      mapX,
      mapY,
      drawPad,
      usableW: Math.max(1, mapWidth - drawPad * 2),
      usableH: Math.max(1, mapHeight - drawPad * 2),
    };

    const sampledIndexes = sampleTrackPointIndexes(points.length);
    const sampledPath = sampledIndexes.map((index) =>
      projectTrackPoint(points, index, bounds, map),
    );

    ctx.beginPath();
    ctx.moveTo(sampledPath[0].x, sampledPath[0].y);
    for (let i = 1; i < sampledPath.length; i++) {
      ctx.lineTo(sampledPath[i].x, sampledPath[i].y);
    }
    ctx.shadowColor = UI_COLORS.neonCyan;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = UI_COLORS.neonCyan;
    ctx.lineWidth = UI_SHAPE.mapRouteWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    const startPoint = projectTrackPoint(points, 0, bounds, map);
    const endPoint = projectTrackPoint(points, points.length - 1, bounds, map);

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = UI_COLORS.tipGray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = UI_COLORS.danger;
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, UI_SHAPE.markerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = UI_COLORS.success;
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, Math.max(3, UI_SHAPE.markerRadius - 2), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = UI_COLORS.textLight;
    ctx.font = responsiveFont(width, UI_FONT.previewLabel);
    const labelXMax = mapX + mapWidth - UI_SHAPE.mapDrawPadding;
    const defaultLabelX = startPoint.x + layout.launchLabelXOffset;
    const labelX = Math.min(labelXMax, defaultLabelX);
    ctx.fillText(UI_TEXT.launchLabel, labelX, startPoint.y + 5);
  }

  ctx.shadowColor = UI_COLORS.neonGreen;
  ctx.shadowBlur = 12;
  ctx.fillStyle = UI_COLORS.neonGreen;
  ctx.font = responsiveFont(width, UI_FONT.previewCta, UI_FONT.bold);
  ctx.fillText(UI_TEXT.previewCta, centerX, panelY + panelHeight * layout.previewCtaYRatio);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

export { drawStartScreen, drawGameOverScreen, drawTrackPreviewScreen };
