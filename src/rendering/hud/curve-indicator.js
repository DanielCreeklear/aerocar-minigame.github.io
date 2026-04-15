import { clamp } from "../../utils/math.js";
import { responsiveSize } from "../../utils/canvas.js";
import { HUD_COLORS, HUD_FONTS, HUD_LAYOUT } from "../../constants/index.js";


function drawCurveIndicator(ctx, gameState, width) {
  const curve = gameState.upcomingCurvature || 0;
  const absCurve = Math.abs(curve);
  if (absCurve < 0.0005) return;

  const intensity = clamp(absCurve / 0.003, 0, 1);
  const arrow = curve > 0 ? ">>" : "<<";

  let color;
  if (intensity > 0.6) {
    color = HUD_COLORS.curveHard;
  } else if (intensity > 0.3) {
    color = HUD_COLORS.curveMild;
  } else {
    color = HUD_COLORS.curveNormal;
  }

  const fontSize = responsiveSize(width, HUD_FONTS.curveArrow);

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = intensity > 0.5 ? 12 : 6;
  ctx.font = `${HUD_FONTS.bold} ${Math.round(fontSize)}px ${HUD_FONTS.family}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.88;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(arrow, width * 0.5, HUD_LAYOUT.curveIndicatorY);
  ctx.restore();
}

export { drawCurveIndicator };
