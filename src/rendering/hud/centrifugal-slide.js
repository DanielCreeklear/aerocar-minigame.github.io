import { clamp } from "../../utils/math.js";
import { HUD_COLORS, HUD_FONTS, CENTRIFUGAL_SLIDE_DURATION } from "../../constants/index.js";
const LABEL_TEXT = "SEM GRIP!";
const VIGNETTE_WIDTH_RATIO = 0.38;
const FLASH_PHASE = 0.85;
function drawCentrifugalSlideEffect(ctx, gameState, width, height) {
  const timer = gameState.centrifugalSlideTimer || 0;
  if (timer <= 0 || gameState.isGameOver) return;
  const progress = clamp(timer / CENTRIFUGAL_SLIDE_DURATION, 0, 1);
  const curvature = gameState.currentCurvature || 0;
  const slideLeft = curvature > 0;
  const edgeX = slideLeft ? 0 : width;
  const innerX = slideLeft
    ? width * VIGNETTE_WIDTH_RATIO
    : width * (1 - VIGNETTE_WIDTH_RATIO);
  const flashIntensity =
    progress > FLASH_PHASE
      ? clamp((progress - FLASH_PHASE) / (1 - FLASH_PHASE), 0, 1)
      : 0;
  const baseAlpha = 0.15 + progress * 0.45 + flashIntensity * 0.25;
  ctx.save();
  // Cache gradient per dimensions and side to avoid reallocation
  if (!drawCentrifugalSlideEffect._gradCache) drawCentrifugalSlideEffect._gradCache = {};
  const side = slideLeft ? "L" : "R";
  const key = `${width}x${height}@${side}`;
  let grad = drawCentrifugalSlideEffect._gradCache[key];
  if (!grad) {
    grad = ctx.createLinearGradient(edgeX, 0, innerX, 0);
    grad.addColorStop(0, `rgba(255,140,0,${clamp(baseAlpha, 0, 0.85)})`);
    grad.addColorStop(0.55, `rgba(255,100,0,${clamp(baseAlpha * 0.35, 0, 0.4)})`);
    grad.addColorStop(1, "rgba(255,100,0,0)");
    drawCentrifugalSlideEffect._gradCache[key] = grad;
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  const borderAlpha = clamp(progress * 0.9, 0, 0.9);
  ctx.shadowColor = HUD_COLORS.centrifugalSlideGlow;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = HUD_COLORS.centrifugalSlideBorder;
  ctx.globalAlpha = borderAlpha;
  ctx.lineWidth = 5;
  const edgeOffset = 2.5;
  if (slideLeft) {
    ctx.beginPath();
    ctx.moveTo(edgeOffset, 0);
    ctx.lineTo(edgeOffset, height);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(width - edgeOffset, 0);
    ctx.lineTo(width - edgeOffset, height);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  const labelAlpha = clamp(progress * 1.2, 0, 1);
  if (labelAlpha > 0.05) {
    const fontSize = Math.max(14, Math.min(22, width * 0.028));
    ctx.font = `${HUD_FONTS.bold} ${Math.round(fontSize)}px ${HUD_FONTS.family}`;
    ctx.textBaseline = "middle";
    ctx.globalAlpha = labelAlpha;
    ctx.shadowColor = HUD_COLORS.centrifugalSlideBorder;
    ctx.shadowBlur = 10;
    ctx.fillStyle = HUD_COLORS.centrifugalSlideText;
    const labelY = height * 0.28;
    const margin = width * 0.045;
    if (slideLeft) {
      ctx.textAlign = "left";
      ctx.fillText(LABEL_TEXT, margin, labelY);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(LABEL_TEXT, width - margin, labelY);
    }
  }
  ctx.restore();
}
export { drawCentrifugalSlideEffect };
