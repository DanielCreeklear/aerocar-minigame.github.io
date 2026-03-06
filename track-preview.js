import {
  getResponsiveUILayout,
  getViewportProfile,
  UI_COLORS,
  UI_FONT,
  UI_LAYOUT,
  UI_SHAPE,
  UI_TEXT,
} from "./constants/index.js";

function responsiveSize(width, spec) {
  return Math.max(spec.min, Math.min(spec.max, width * spec.ratio));
}

function responsiveFont(width, spec, weight = "") {
  const weightPrefix = weight ? `${weight} ` : "";
  return `${weightPrefix}${responsiveSize(width, spec)}px ${UI_FONT.family}`;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function calculateTrackBounds(points) {
  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i < points.length; i++) {
    if (points[i].x < minX) minX = points[i].x;
    if (points[i].x > maxX) maxX = points[i].x;
  }

  return {
    minX,
    xRange: Math.max(1, maxX - minX),
  };
}

function projectPoint(points, index, bounds, map) {
  const t = points.length > 1 ? index / (points.length - 1) : 0;
  const nx = (points[index].x - bounds.minX) / bounds.xRange;

  return {
    x: map.mapX + map.drawPad + nx * map.usableW,
    y: map.mapY + map.drawPad + t * map.usableH,
    index,
  };
}

function samplePathIndexes(pointsLength) {
  const step = Math.max(
    1,
    Math.floor(pointsLength / UI_SHAPE.previewMaxPointsStep),
  );
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

export function drawTrackPreviewScreen(ctx, width, height, track) {
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
  const mapPadding = Math.min(
    layout.mapPaddingMax,
    panelWidth * layout.mapPaddingRatio,
  );
  const mapX = panelX + mapPadding;
  const mapY = panelY + panelHeight * layout.previewMapYRatio;
  const mapWidth = panelWidth - mapPadding * 2;
  const mapHeight = panelHeight * layout.previewMapHeightRatio;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, UI_COLORS.previewBgA);
  bg.addColorStop(1, UI_COLORS.previewBgB);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawRoundedRect(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    UI_SHAPE.panelRadius,
  );
  ctx.fillStyle = UI_COLORS.previewPanelFill;
  ctx.fill();
  ctx.strokeStyle = UI_COLORS.previewPanelStroke;
  ctx.lineWidth = UI_SHAPE.strokeWidth;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = UI_COLORS.success;
  ctx.font = responsiveFont(width, UI_FONT.previewTitle, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.previewTitle,
    centerX,
    panelY + panelHeight * layout.previewTitleYRatio,
  );

  const totalKm = ((track.lapLength || 0) / 1000).toFixed(2);
  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.previewInfo);
  const previewInfo = UI_TEXT.previewInfoTemplate
    .replace("{seed}", String(track.seed))
    .replace("{segments}", String(track.segments.length))
    .replace("{km}", String(totalKm));
  ctx.fillText(
    previewInfo,
    centerX,
    panelY + panelHeight * layout.previewInfoYRatio,
  );

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

    const sampledIndexes = samplePathIndexes(points.length);
    const sampledPath = sampledIndexes.map((index) =>
      projectPoint(points, index, bounds, map),
    );

    ctx.beginPath();
    ctx.moveTo(sampledPath[0].x, sampledPath[0].y);
    for (let i = 1; i < sampledPath.length; i++) {
      ctx.lineTo(sampledPath[i].x, sampledPath[i].y);
    }

    ctx.strokeStyle = UI_COLORS.gold;
    ctx.lineWidth = UI_SHAPE.mapRouteWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    const lastIndex = points.length - 1;
    const startPoint = projectPoint(points, 0, bounds, map);
    const endPoint = projectPoint(points, lastIndex, bounds, map);

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
    ctx.arc(
      endPoint.x,
      endPoint.y,
      Math.max(3, UI_SHAPE.markerRadius - 2),
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.fillStyle = UI_COLORS.textLight;
    ctx.font = responsiveFont(width, UI_FONT.previewLabel);
    const labelXMax = mapX + mapWidth - UI_SHAPE.mapDrawPadding;
    const defaultLabelX = startPoint.x + layout.launchLabelXOffset;
    const labelX = Math.min(labelXMax, defaultLabelX);
    ctx.fillText(UI_TEXT.launchLabel, labelX, startPoint.y + 5);
  }

  ctx.fillStyle = UI_COLORS.success;
  ctx.font = responsiveFont(width, UI_FONT.previewCta, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.previewCta,
    centerX,
    panelY + panelHeight * layout.previewCtaYRatio,
  );

  ctx.textAlign = "left";
}
