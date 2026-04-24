import { drawRoundedRect } from "../utils/canvas.js";
const SAMPLE_INTERVAL_MS = 50;
const MAX_SAMPLES = 600;
const ACCEL_REF = 5;
class TelemetryManager {
  constructor() {
    this._buf = new Array(MAX_SAMPLES).fill(null);
    this._head = 0;
    this._count = 0;
    this._lastSampleMs = -Infinity;
    this._hudVisible = true;
  }
  reset() {
    this._head = 0;
    this._count = 0;
    this._lastSampleMs = -Infinity;
  }
  log(gameState, physicsTelemetry = null) {
    const now = gameState.currentTime;
    if (now - this._lastSampleMs < SAMPLE_INTERVAL_MS) return;
    this._lastSampleMs = now;
    const prev =
      this._count > 0
        ? this._buf[(this._head - 1 + MAX_SAMPLES) % MAX_SAMPLES]
        : null;
    const sampleDt = prev
      ? Math.max((now - prev.t) / 1000, 0.001)
      : SAMPLE_INTERVAL_MS / 1000;
    const accel = prev ? (gameState.speed - prev.vz) / sampleDt : 0;
    this._buf[this._head] = {
      t: now,
      z: gameState.currentZ,
      x: gameState.lateralOffset,
      vz: gameState.speed,
      vx: gameState.lateralVelocity,
      curvature: gameState.currentCurvature,
      slip: gameState.currentSlip,
      centrifugalForce: physicsTelemetry
        ? physicsTelemetry.centrifugalForce
        : 0,
      effectiveGrip: physicsTelemetry ? physicsTelemetry.effectiveGrip : 0,
      // lateral diagnostics (may be undefined)
      lateral: physicsTelemetry && physicsTelemetry.lateral ? physicsTelemetry.lateral : null,
      gripRatio: physicsTelemetry && physicsTelemetry.lateral ? physicsTelemetry.lateral.gripRatio : 0,
      steerEffectiveness: physicsTelemetry && physicsTelemetry.lateral ? physicsTelemetry.lateral.steerEffectiveness : 0,
      overDriveFactor: physicsTelemetry && physicsTelemetry.lateral ? physicsTelemetry.lateral.overDriveFactor : 0,
      drift: physicsTelemetry && physicsTelemetry.lateral ? physicsTelemetry.lateral.drift : 0,
      // transient lateral warning field (string or null)
      lateralWarning: physicsTelemetry && physicsTelemetry.lateralWarning ? physicsTelemetry.lateralWarning : null,
      aeroMode: gameState.aeroMode,
      battery: gameState.battery,
      isOffTrack: gameState.isOffTrack ? 1 : 0,
      accel,
      throttle: gameState.isBoosting ? 1 : 0,
      brake: gameState.isBraking ? 1 : 0,
      steer: gameState.steerInput ?? 0,
      steerTarget: gameState.steerTarget ?? 0,
      heading: gameState.carHeading ?? 0,
      isDrifting: gameState.isDrifting ? 1 : 0,
    };
    this._head = (this._head + 1) % MAX_SAMPLES;
    if (this._count < MAX_SAMPLES) this._count++;
  }
  exportJSON() {
    const samples = this._getSamples();
    if (samples.length === 0) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            sampleCount: samples.length,
            sampleIntervalMs: SAMPLE_INTERVAL_MS,
            fields: [
              "t",
              "z",
              "x",
              "vz",
              "vx",
              "curvature",
              "slip",
              "centrifugalForce",
              "effectiveGrip",
              "lateralWarning",
              "aeroMode",
              "battery",
              "isOffTrack",
              "accel",
              "throttle",
              "brake",
              "steer",
              "steerTarget",
              "heading",
              "isDrifting",
            ],
            samples,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telemetry_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  toggleHUD() {
    this._hudVisible = !this._hudVisible;
  }
  drawHUD(ctx, width, height, isMobile = false) {
    if (!this._hudVisible || isMobile) return;
    const d = this._getLatest();
    if (!d) return;
    const PX = 10;
    const PY = 62;
    const PW = 256;
    const PH = 368;
    const COL = PX + 10;
    const LH = 16;
    let cy = PY + 8;
    ctx.save();
    drawRoundedRect(ctx, PX, PY, PW, PH, 8);
    ctx.fillStyle = "rgba(4, 10, 18, 0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '700 10px Consolas,"Courier New",monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(241, 196, 15, 0.95)";
    ctx.fillText("\u25A0 TELEMETRIA", COL, cy);
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(149, 165, 166, 0.8)";
    ctx.fillText("[H] fechar", PX + PW - 8, cy);
    ctx.textAlign = "left";
    cy += LH + 2;
    _sep(ctx, PX, PX + PW, cy);
    cy += 5;
    ctx.fillStyle = "#ecf0f1";
    ctx.fillText(
      `Vz: ${d.vz.toFixed(1).padStart(5)} m/s   Vx: ${_sign(d.vx)}${d.vx.toFixed(2)}`,
      COL,
      cy,
    );
    cy += LH;
    ctx.fillText(
      `\u03BA: ${_sign(d.curvature)}${d.curvature.toFixed(4)}   slip: ${d.slip.toFixed(3)}`,
      COL,
      cy,
    );
    cy += LH + 4;
    ctx.fillStyle = "rgba(241, 196, 15, 0.85)";
    ctx.fillText("CENTRIF vs GRIP", COL, cy);
    cy += LH;
    const BAR_W = PW - 20;
    const BAR_H = 14;
    const BX = PX + 10;
    const scale = Math.max(
      Math.abs(d.centrifugalForce),
      d.effectiveGrip,
      0.001,
    );
    const cfPct =
      d.effectiveGrip > 0.001
        ? Math.round((Math.abs(d.centrifugalForce) / d.effectiveGrip) * 100)
        : 0;
    ctx.fillStyle = "rgba(20, 45, 20, 0.8)";
    ctx.fillRect(BX, cy, BAR_W, BAR_H);
    const gFill = Math.min(d.effectiveGrip / scale, 1) * BAR_W;
    if (gFill > 0) {
      ctx.fillStyle = "#27ae60";
      ctx.fillRect(BX, cy, gFill, BAR_H);
    }
    ctx.fillStyle = "#ecf0f1";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `GRIP  ${d.effectiveGrip.toFixed(2)}`,
      BX + 4,
      cy + BAR_H * 0.5,
    );
    ctx.textBaseline = "top";
    cy += BAR_H + 3;
    ctx.fillStyle = "rgba(45, 20, 20, 0.8)";
    ctx.fillRect(BX, cy, BAR_W, BAR_H);
    const cFill = Math.min(Math.abs(d.centrifugalForce) / scale, 1) * BAR_W;
    if (cFill > 0) {
      ctx.fillStyle = d.slip > 0.15 ? "#c0392b" : "#e08b2e";
      ctx.fillRect(BX, cy, cFill, BAR_H);
    }
    ctx.fillStyle = "#ecf0f1";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `CF    ${Math.abs(d.centrifugalForce).toFixed(2)}  (${cfPct}%)`,
      BX + 4,
      cy + BAR_H * 0.5,
    );
    ctx.textBaseline = "top";
    cy += BAR_H + 6;
    _sep(ctx, PX, PX + PW, cy);
    cy += 5;
    ctx.fillStyle = "rgba(86, 180, 233, 0.9)";
    ctx.fillText("STEER", COL, cy);
    cy += LH;
    ctx.fillStyle = "#ecf0f1";
    ctx.fillText(
      `steer: ${_sign(d.steer)}${(d.steer ?? 0).toFixed(3)}`,
      COL,
      cy,
    );
    cy += LH + 4;
    _sep(ctx, PX, PX + PW, cy);
    cy += 5;
    ctx.fillStyle = d.isOffTrack ? "#e74c3c" : "#b2bec3";
    ctx.fillText(
      `MODO: ${d.aeroMode}   ERS: ${Math.floor(d.battery)}%${d.isOffTrack ? "  [!] OFF-TRACK" : ""}`,
      COL,
      cy,
    );
    cy += LH + 3;
    _sep(ctx, PX, PX + PW, cy);
    cy += 5;
    ctx.fillStyle = "rgba(86, 180, 233, 0.9)";
    ctx.fillText("INPUTS", COL, cy);
    cy += LH;
    {
      const chartData = this._getLastN(80);
      const CX = BX;
      const CHART_W = BAR_W;
      const CHART_H1 = 36;
      const CHART_H2 = 24;
      const n = chartData.length;
      const midY1 = cy + CHART_H1 * 0.5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(CX, cy, CHART_W, CHART_H1);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 0.5;
      [0.25, 0.75].forEach((f) => {
        ctx.beginPath();
        ctx.moveTo(CX, cy + CHART_H1 * f);
        ctx.lineTo(CX + CHART_W, cy + CHART_H1 * f);
        ctx.stroke();
      });
      if (n > 1) {
        const mapSy = (s) =>
          midY1 -
          Math.max(-1, Math.min(1, s.accel / ACCEL_REF)) * (CHART_H1 * 0.5 - 2);
        ctx.save();
        ctx.beginPath();
        ctx.rect(CX, cy, CHART_W, CHART_H1 * 0.5);
        ctx.clip();
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          i === 0
            ? ctx.moveTo(sx, mapSy(chartData[i]))
            : ctx.lineTo(sx, mapSy(chartData[i]));
        }
        ctx.lineTo(CX + CHART_W, midY1);
        ctx.lineTo(CX, midY1);
        ctx.closePath();
        ctx.fillStyle = "rgba(39, 174, 96, 0.30)";
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(CX, midY1, CHART_W, CHART_H1 * 0.5 + 1);
        ctx.clip();
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          i === 0
            ? ctx.moveTo(sx, mapSy(chartData[i]))
            : ctx.lineTo(sx, mapSy(chartData[i]));
        }
        ctx.lineTo(CX + CHART_W, midY1);
        ctx.lineTo(CX, midY1);
        ctx.closePath();
        ctx.fillStyle = "rgba(192, 57, 43, 0.30)";
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.strokeStyle = "#ecf0f1";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          i === 0
            ? ctx.moveTo(sx, mapSy(chartData[i]))
            : ctx.lineTo(sx, mapSy(chartData[i]));
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(CX, midY1);
      ctx.lineTo(CX + CHART_W, midY1);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(39, 174, 96, 0.85)";
      ctx.fillText("ACEL", CX + 3, cy + 2);
      ctx.fillStyle = "rgba(192, 57, 43, 0.85)";
      ctx.fillText("FREIN", CX + 3, cy + CHART_H1 - LH + 2);
      cy += CHART_H1 + 4;
      const midY2 = cy + CHART_H2 * 0.5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(CX, cy, CHART_W, CHART_H2);
      if (n > 1) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = midY2 - chartData[i].steer * (CHART_H2 * 0.5 - 2);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.lineTo(CX + CHART_W, midY2);
        ctx.lineTo(CX, midY2);
        ctx.closePath();
        ctx.fillStyle = "rgba(86, 180, 233, 0.18)";
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(86, 180, 233, 0.9)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = midY2 - chartData[i].steer * (CHART_H2 * 0.5 - 2);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(CX, midY2);
      ctx.lineTo(CX + CHART_W, midY2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(86, 180, 233, 0.85)";
      ctx.fillText("STR", CX + 3, cy + 2);
      cy += CHART_H2 + 4;
      const CHART_H3 = 22;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(CX, cy, CHART_W, CHART_H3);
      if (n > 1) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = cy + CHART_H3 * (1 - chartData[i].throttle);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.lineTo(CX + CHART_W, cy + CHART_H3);
        ctx.lineTo(CX, cy + CHART_H3);
        ctx.closePath();
        ctx.fillStyle = "rgba(39, 174, 96, 0.28)";
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = cy + CHART_H3 * (1 - chartData[i].throttle);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(39, 174, 96, 0.85)";
      ctx.fillText("ERS", CX + 3, cy + 2);
      cy += CHART_H3 + 4;
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(CX, cy, CHART_W, CHART_H3);
      if (n > 1) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = cy + CHART_H3 * (1 - chartData[i].brake);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.lineTo(CX + CHART_W, cy + CHART_H3);
        ctx.lineTo(CX, cy + CHART_H3);
        ctx.closePath();
        ctx.fillStyle = "rgba(192, 57, 43, 0.28)";
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < n; i++) {
          const sx = CX + (i / (n - 1)) * CHART_W;
          const sy = cy + CHART_H3 * (1 - chartData[i].brake);
          i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(192, 57, 43, 0.85)";
      ctx.fillText("BRK", CX + 3, cy + 2);
      cy += CHART_H3 + 4;
    }
    ctx.fillStyle = "rgba(127, 140, 141, 0.65)";
    ctx.fillText("[T] Export JSON", COL, cy);
    ctx.restore();
  }
  _getLatest() {
    if (this._count === 0) return null;
    return this._buf[(this._head - 1 + MAX_SAMPLES) % MAX_SAMPLES];
  }
  _getLastN(n) {
    if (this._count === 0) return [];
    const count = Math.min(n, this._count);
    const oldest = (this._head - count + MAX_SAMPLES) % MAX_SAMPLES;
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      out[i] = this._buf[(oldest + i) % MAX_SAMPLES];
    }
    return out;
  }
  _getSamples() {
    if (this._count === 0) return [];
    const oldest = this._count < MAX_SAMPLES ? 0 : this._head;
    const out = new Array(this._count);
    for (let i = 0; i < this._count; i++) {
      out[i] = this._buf[(oldest + i) % MAX_SAMPLES];
    }
    return out;
  }
}
function _sep(ctx, x1, x2, y) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1 + 4, y);
  ctx.lineTo(x2 - 4, y);
  ctx.stroke();
  ctx.restore();
}
function _sign(v) {
  return v >= 0 ? "+" : "";
}
export { TelemetryManager };
