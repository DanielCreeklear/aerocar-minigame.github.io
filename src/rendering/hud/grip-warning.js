import { clamp } from "../../utils/math.js";
import { HUD_COLORS, HUD_LAYOUT } from "../../constants/index.js";
import { SLIP_PENALTY_THRESHOLD } from "../../constants/index.js";

let _warningTick = 0;


function drawGripWarning(ctx, gameState, width, height) {
  const isOffTrack = gameState.isOffTrack;
  const slip = gameState.currentSlip || 0;
  const isPenalized = slip >= SLIP_PENALTY_THRESHOLD;

  if (!isOffTrack && !isPenalized) {
    _warningTick = 0;
    return;
  }

  _warningTick += HUD_LAYOUT.warningPulseSpeed * Math.PI * 2;

  const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(_warningTick * 8));

  const thickness = HUD_LAYOUT.warningThickness;

  const borderColor = isOffTrack ? HUD_COLORS.offTrackBorder : HUD_COLORS.warningBorder;
  const glowColor = isOffTrack ? HUD_COLORS.offTrackGlow : HUD_COLORS.warningGlow;

  ctx.save();
  ctx.globalAlpha = pulse;

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = thickness * 2;
  ctx.strokeRect(0, 0, width, height);

  ctx.shadowBlur = 0;
  ctx.lineWidth = thickness;
  ctx.strokeRect(
    thickness * 0.5,
    thickness * 0.5,
    width - thickness,
    height - thickness,
  );

  ctx.restore();
}

function resetGripWarning() {
  _warningTick = 0;
}

export { drawGripWarning, resetGripWarning };
