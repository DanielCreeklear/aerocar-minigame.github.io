import { formatTime } from "../utils/math.js";
import { drawRoundedRect } from "../utils/canvas.js";
import { SLIP_PENALTY_THRESHOLD } from "../constants/index.js";

const SPEEDOMETER_SCALE_TO_KMH = 8;
const SPEEDOMETER_MAX_KMH = 399;
const SPEEDOMETER_SMOOTHING = 0.18;

class HudRenderer {
  constructor() {
    this.displayedSpeedKmh = 0;
  }

  reset() {
    this.displayedSpeedKmh = 0;
  }

  drawSpeedometer(ctx, gameState, width, height, speedometerMetrics) {
    const rawSpeed = Math.max(0, gameState.speed || 0);
    const targetSpeedKmh = Math.min(
      SPEEDOMETER_MAX_KMH,
      rawSpeed * SPEEDOMETER_SCALE_TO_KMH,
    );

    this.displayedSpeedKmh +=
      (targetSpeedKmh - this.displayedSpeedKmh) * SPEEDOMETER_SMOOTHING;

    const shownSpeed = Math.round(this.displayedSpeedKmh);
    const panelWidth = Math.max(
      speedometerMetrics.minWidth,
      Math.min(speedometerMetrics.maxWidth, width * speedometerMetrics.widthRatio),
    );
    const panelHeight = Math.max(
      speedometerMetrics.minHeight,
      Math.min(speedometerMetrics.maxHeight, height * speedometerMetrics.heightRatio),
    );
    const margin = Math.max(
      speedometerMetrics.minMargin,
      Math.min(speedometerMetrics.maxMargin, width * 0.02),
    );
    const x = width - panelWidth - margin;
    const y = height - panelHeight - margin;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 8;
    drawRoundedRect(ctx, x, y, panelWidth, panelHeight, 12);
    ctx.fillStyle = "rgba(6, 12, 20, 0.78)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const speedFontSize = Math.max(30, Math.min(50, panelHeight * 0.5));
    const labelFontSize = Math.max(10, Math.min(15, panelHeight * 0.2));

    ctx.fillStyle = "#ecf0f1";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${speedFontSize}px Consolas, 'Courier New', monospace`;
    ctx.fillText(`${shownSpeed}`, x + panelWidth - 14, y + panelHeight * 0.52);

    ctx.fillStyle = "rgba(241, 196, 15, 0.95)";
    ctx.font = `700 ${labelFontSize}px sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText("KM/H", x + panelWidth - 14, y + panelHeight - 12);
    ctx.restore();
  }

  drawBatteryBar(ctx, gameState, width, height) {
    const battery = Math.max(0, Math.min(100, gameState.battery || 0));
    const { isBoosting, isBraking } = gameState;

    const barWidth = Math.max(80, Math.min(160, width * 0.18));
    const barHeight = Math.max(10, Math.min(16, height * 0.022));
    const margin = Math.max(8, Math.min(18, width * 0.02));
    const x = margin;
    const y = margin;
    const radius = barHeight * 0.45;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    drawRoundedRect(ctx, x - 2, y - 2, barWidth + 4, barHeight + 4, radius + 2);
    ctx.fillStyle = "rgba(6, 12, 20, 0.75)";
    ctx.fill();
    ctx.shadowBlur = 0;

    const fillW = (battery / 100) * barWidth;
    let barColor;
    if (isBraking && !isBoosting) {
      barColor = "#2ecc71";
    } else if (isBoosting) {
      barColor = battery < 20 ? "#e74c3c" : "#f1c40f";
    } else {
      barColor = battery < 25 ? "#e74c3c" : battery < 50 ? "#f39c12" : "#2ecc71";
    }

    if (fillW > 0) {
      drawRoundedRect(ctx, x, y, fillW, barHeight, radius);
      ctx.fillStyle = barColor;
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, barWidth, barHeight, radius);
    ctx.stroke();

    const labelSize = Math.max(9, Math.min(12, barHeight * 0.8));
    ctx.fillStyle = "rgba(236,240,241,0.92)";
    ctx.font = `700 ${labelSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
      `ERS ${Math.floor(battery)}%${isBraking && !isBoosting ? " +" : ""}`,
      x,
      y + barHeight + 3,
    );
    ctx.restore();
  }

  drawAeroModeButton(ctx, gameState, width, height) {
    const isX = gameState.aeroMode === "X";
    const btnW = Math.max(70, Math.min(120, width * 0.13));
    const btnH = Math.max(28, Math.min(48, height * 0.065));
    const margin = Math.max(8, Math.min(18, width * 0.02));
    const x = width - btnW - margin;
    const y = height / 2 - btnH / 2;
    const radius = btnH * 0.35;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 8;
    drawRoundedRect(ctx, x, y, btnW, btnH, radius);
    ctx.fillStyle = isX
      ? "rgba(231, 76, 60, 0.82)"
      : "rgba(52, 152, 219, 0.82)";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isX
      ? "rgba(255, 180, 170, 0.7)"
      : "rgba(141, 206, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fontSize = Math.max(11, Math.min(16, btnH * 0.42));
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isX ? "MODO X" : "MODO Z", x + btnW * 0.5, y + btnH * 0.5);
    ctx.restore();
  }

  updateStatusText(statusText, gameState) {
    const timeStr = formatTime(gameState.currentTime);
    const alertMsg =
      gameState.currentSlip > SLIP_PENALTY_THRESHOLD
        ? ` | GRIP NO LIMITE (${gameState.currentSlip.toFixed(1)})`
        : "";
    const offTrackMsg = gameState.isOffTrack ? " | OFF-TRACK (GRAMA)" : "";
    const brakeMsg = gameState.isBraking ? " | FREIO" : "";

    statusText.innerText = `${timeStr} | Volta: ${gameState.lapCount + 1}/${gameState.targetLaps} | Trecho: ${gameState.currentSegmentIndex}/${gameState.totalSegments}\nModo: ${gameState.aeroMode} | Bateria: ${Math.floor(gameState.battery)}%${brakeMsg}${alertMsg}${offTrackMsg}`;
  }

  draw(ctx, gameState, width, height, speedometerMetrics, statusText) {
    this.drawSpeedometer(ctx, gameState, width, height, speedometerMetrics);
    this.drawBatteryBar(ctx, gameState, width, height);
    this.drawAeroModeButton(ctx, gameState, width, height);
    this.updateStatusText(statusText, gameState);
  }
}

export { HudRenderer };
