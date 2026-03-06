import { formatTime } from "./utils.js";
import {
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

export function drawStartScreen(ctx, width, height) {
  const centerX = width * UI_LAYOUT.halfRatio;
  const panelWidth = Math.min(
    width * UI_LAYOUT.startPanelWidthRatio,
    UI_LAYOUT.startPanelMaxWidth,
  );
  const panelHeight = Math.min(
    height * UI_LAYOUT.startPanelHeightRatio,
    UI_LAYOUT.startPanelMaxHeight,
  );
  const panelX = (width - panelWidth) * UI_LAYOUT.halfRatio;
  const panelY = Math.max(
    UI_LAYOUT.startPanelMinTopMargin,
    (height - panelHeight) * UI_LAYOUT.halfRatio,
  );

  const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
  backgroundGradient.addColorStop(0, UI_COLORS.startBgA);
  backgroundGradient.addColorStop(0.6, UI_COLORS.startBgB);
  backgroundGradient.addColorStop(1, UI_COLORS.startBgC);
  ctx.fillStyle = backgroundGradient;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(
    centerX,
    height * UI_LAYOUT.startVignetteCenterYRatio,
    width * UI_LAYOUT.startVignetteInnerRatio,
    centerX,
    height * UI_LAYOUT.startVignetteCenterYRatio,
    width * UI_LAYOUT.startVignetteOuterRatio,
  );
  vignette.addColorStop(0, UI_COLORS.transparentBlack);
  vignette.addColorStop(1, UI_COLORS.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  drawRoundedRect(
    ctx,
    panelX,
    panelY,
    panelWidth,
    panelHeight,
    UI_SHAPE.panelRadius,
  );
  ctx.fillStyle = UI_COLORS.panelFill;
  ctx.fill();
  ctx.strokeStyle = UI_COLORS.panelStroke;
  ctx.lineWidth = UI_SHAPE.strokeWidth;
  ctx.stroke();

  ctx.fillStyle = UI_COLORS.panelAccent;
  drawRoundedRect(
    ctx,
    panelX + UI_SHAPE.accentInset,
    panelY + UI_SHAPE.accentInset,
    panelWidth - UI_SHAPE.accentInset * 2,
    UI_SHAPE.accentHeight,
    UI_SHAPE.accentRadius,
  );
  ctx.fill();

  ctx.textAlign = "center";
  ctx.shadowColor = UI_COLORS.shadow;
  ctx.shadowBlur = UI_SHAPE.shadowStrong;
  ctx.fillStyle = UI_COLORS.gold;
  ctx.font = responsiveFont(width, UI_FONT.startTitle, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.gameTitle,
    centerX,
    panelY + panelHeight * UI_LAYOUT.titleYRatio,
  );

  ctx.shadowBlur = UI_SHAPE.shadowSoft;
  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.startSubtitle, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.startSubtitle,
    centerX,
    panelY + panelHeight * UI_LAYOUT.subtitleYRatio,
  );

  ctx.shadowBlur = UI_SHAPE.shadowOff;
  ctx.textAlign = "left";
  const textX = panelX + panelWidth * UI_LAYOUT.leftColumnXRatio;
  const rightX = panelX + panelWidth * UI_LAYOUT.rightColumnXRatio;
  const sectionTop = panelY + panelHeight * UI_LAYOUT.sectionTopYRatio;

  ctx.fillStyle = UI_COLORS.infoBlue;
  ctx.font = responsiveFont(width, UI_FONT.startSection, UI_FONT.bold);
  ctx.fillText(UI_TEXT.controlsTitle, textX, sectionTop);

  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.startBody, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.controlsLeft,
    textX,
    sectionTop + UI_LAYOUT.lineSpacing1,
  );
  ctx.fillText(
    UI_TEXT.controlsRight,
    textX,
    sectionTop + UI_LAYOUT.lineSpacing2,
  );

  ctx.fillStyle = UI_COLORS.tipGray;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(UI_TEXT.controlsTip, textX, sectionTop + UI_LAYOUT.lineSpacing3);

  ctx.fillStyle = UI_COLORS.success;
  ctx.font = responsiveFont(width, UI_FONT.startSection, UI_FONT.bold);
  ctx.fillText(UI_TEXT.goalTitle, rightX, sectionTop);

  ctx.fillStyle = UI_COLORS.textLight;
  ctx.font = responsiveFont(width, UI_FONT.startBody);
  ctx.fillText(UI_TEXT.goalLine1, rightX, sectionTop + UI_LAYOUT.lineSpacing1);
  ctx.fillText(UI_TEXT.goalLine2, rightX, sectionTop + UI_LAYOUT.lineSpacing2);

  ctx.fillStyle = UI_COLORS.accentOrange;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(
    UI_TEXT.goalTagline,
    rightX,
    sectionTop + UI_LAYOUT.lineSpacing3,
  );

  ctx.fillStyle = UI_COLORS.success;
  ctx.textAlign = "center";
  ctx.font = responsiveFont(width, UI_FONT.startCta, UI_FONT.bold);
  ctx.fillText(
    UI_TEXT.startCta,
    centerX,
    panelY + panelHeight * UI_LAYOUT.startCtaYRatio,
  );

  ctx.fillStyle = UI_COLORS.subtleText;
  ctx.font = responsiveFont(width, UI_FONT.startTip);
  ctx.fillText(
    UI_TEXT.startFootnote,
    centerX,
    panelY + panelHeight * UI_LAYOUT.startTipYRatio,
  );
  ctx.textAlign = "left";
}

export function drawGameOverScreen(ctx, width, height, finalTime) {
  ctx.fillStyle = UI_COLORS.gameOverOverlay;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = UI_COLORS.white;
  ctx.textAlign = "center";
  ctx.font = UI_FONT.gameOverTitle;
  ctx.fillText(UI_TEXT.gameOverTitle, width / 2, height / 2 - 40);
  ctx.fillStyle = UI_COLORS.success;
  ctx.font = UI_FONT.gameOverTime;
  ctx.fillText(formatTime(finalTime), width / 2, height / 2 + 10);
  ctx.fillStyle = UI_COLORS.white;
  ctx.font = UI_FONT.gameOverHint;
  ctx.fillText(UI_TEXT.gameOverHint, width / 2, height / 2 + 70);
  ctx.textAlign = "left";
}
