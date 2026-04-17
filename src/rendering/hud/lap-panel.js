// Neo-Retro R4 — Telemetry Block (top-right)
import { formatTime } from "../../utils/math.js";

const R4_ACCENT = "#FDB80B";
const R4_BG = "rgba(26,26,26,0.80)";
const R4_SHADOW = "rgba(0,0,0,0.50)";
const R4_FONT = "'Archivo Narrow','Barlow Condensed','Roboto Condensed',sans-serif";
const R4_MONO = "'Courier New',monospace";

function drawLapPanel(ctx, gameState, width, height) {
  const margin = Math.max(8, Math.min(14, width * 0.022));
  const panelW = Math.max(130, Math.min(200, width * 0.32));
  const panelH = Math.max(76, Math.min(110, height * 0.17));
  const x = width - panelW - margin;
  const y = margin;

  ctx.save();

  // 1. Solid shadow
  ctx.fillStyle = R4_SHADOW;
  ctx.fillRect(x + 4, y + 4, panelW, panelH);

  // 2. Card body
  ctx.fillStyle = R4_BG;
  ctx.fillRect(x, y, panelW, panelH);

  // 3. Left accent stripe
  ctx.fillStyle = R4_ACCENT;
  ctx.fillRect(x, y, 3, panelH);

  const padX = x + 10;
  const right = x + panelW - 8;

  // 4. LAP label + count
  const lapLabelSz = Math.max(8, Math.min(11, width * 0.018));
  ctx.font = `italic bold ${lapLabelSz}px ${R4_FONT}`;
  ctx.fillStyle = R4_ACCENT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("LAP", padX, y + 6);

  const lapCountSz = Math.max(14, Math.min(20, width * 0.033));
  ctx.font = `italic bold ${lapCountSz}px ${R4_FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "right";
  ctx.fillText(`${gameState.lapCount + 1}/${gameState.targetLaps}`, right, y + 5);

  // 5. Current time (monospace)
  const timeSz = Math.max(18, Math.min(28, panelH * 0.32));
  ctx.font = `italic bold ${timeSz}px ${R4_MONO}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(formatTime(gameState.currentTime), right, y + 6 + lapLabelSz + 4);

  // Separator line
  const divY = y + 6 + lapLabelSz + 4 + timeSz + 4;
  ctx.strokeStyle = "rgba(253,184,11,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 6, divY);
  ctx.lineTo(x + panelW - 6, divY);
  ctx.stroke();

  // 6. RECORD row
  const recLabelSz = Math.max(7, Math.min(9, width * 0.015));
  const recTimeSz = Math.max(10, Math.min(14, panelH * 0.15));
  const recY = divY + 3;

  ctx.font = `italic bold ${recLabelSz}px ${R4_FONT}`;
  ctx.fillStyle = "rgba(180,180,180,0.70)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RECORD", padX, recY);

  const bestTxt =
    gameState.bestLapTime < Infinity
      ? formatTime(gameState.bestLapTime)
      : "--:--.---";
  ctx.font = `italic bold ${recTimeSz}px ${R4_MONO}`;
  ctx.fillStyle = gameState.bestLapTime < Infinity ? "rgba(253,184,11,0.85)" : "rgba(255,255,255,0.30)";
  ctx.textAlign = "right";
  ctx.fillText(bestTxt, right, recY);

  // 7. Last lap flash
  if (gameState.lastLapFlashTimer > 0 && gameState.lastLapTime != null) {
    const alpha = Math.min(1, gameState.lastLapFlashTimer / 2.0);
    const flashH = 20;
    const flashY = y + panelH + 4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = R4_SHADOW;
    ctx.fillRect(x + 4, flashY + 4, panelW, flashH);
    ctx.fillStyle = R4_BG;
    ctx.fillRect(x, flashY, panelW, flashH);
    ctx.fillStyle = R4_ACCENT;
    ctx.fillRect(x, flashY, 3, flashH);
    ctx.font = `italic bold ${Math.max(9, recLabelSz)}px ${R4_FONT}`;
    ctx.fillStyle = R4_ACCENT;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `VOLTA ${gameState.lapCount}:  ${formatTime(gameState.lastLapTime)}`,
      x + 10,
      flashY + flashH * 0.5,
    );
    ctx.restore();
  }

  ctx.restore();
}

export { drawLapPanel };
